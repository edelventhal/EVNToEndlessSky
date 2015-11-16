/*global require*/
/*global console*/
/*global process*/
/*global module*/
/*global Buffer*/
/*global parseInt*/

var fs = require( "fs" );
var parseString = require( "xml2js" ).parseString;
var atob = require( "atob" );

var EvnParse = function()
{
    this.fileParsesRemaining = 0;
    this.results = {};
    this.templates = null;
    this.includeRawData = false;
    this.parsingTemplate = false;
    this.exportPath = "./evndata.json";
};

//loads a templates file into the parser. If you're doing anything other than
//generating a templates file, you need to call this first.
EvnParse.prototype.loadTemplates = function( templatePath )
{
    this.templates = JSON.parse( fs.readFileSync( templatePath, "utf8" ) );
};

//parses an array of source paths. a source path can also be a folder, in which
//case all contents within the folder that have a .xml extension will be parsed.
//this can crap out if too much is parsed at once. A directory will not be searched
//recursively.
EvnParse.prototype.parse = function( sourcePaths, exportPath )
{
    this.exportPath = exportPath || this.exportPath;
    this.parsingTemplate = !this.templates;
    
    var files = [];
    
    var pathIndex;
    for ( pathIndex = 0; pathIndex < sourcePaths.length; pathIndex++ )
    {
        var path = sourcePaths[ pathIndex ];
        
        if ( fs.lstatSync( path ).isDirectory() )
        {
            var dirContents = fs.readdirSync( path );
            var subFileIndex;
            for ( subFileIndex = 0; subFileIndex < dirContents.length; subFileIndex++ )
            {
                var subFile = dirContents[ subFileIndex ];
                if ( subFile.substring( subFile.lastIndexOf( "." ) + 1 ).toLowerCase() === "xml" )
                {
                    files.push( path + "/" + subFile );
                }
            }
        }
        else
        {
            files.push( path );
        }
    }
    
    this.fileParsesRemaining = files.length;

    var fileIndex;
    for ( fileIndex = 0; fileIndex < files.length; fileIndex++ )
    {
        var filePath = files[ fileIndex ];
        console.log( "parsing file " + filePath );
        var text = fs.readFileSync( filePath, "utf8" );
        parseString( text, this._parseFile.bind( this ) );
    }
};

//parses a single file. You should not call this directly
EvnParse.prototype._parseFile = function( err, data )
{
    if ( err )
    {
        console.log( "Failed to parse a file: " + err );
    }
    else
    {
        var typeIndex;
        var types = data.RezMap.TypesArray[0].Type;
        for ( typeIndex = 0; typeIndex < types.length; typeIndex++ )
        {
            this._parseType( types[ typeIndex ] );
        }
    }
    
    //move on once we've parsed everything
    this.fileParsesRemaining--;
    if ( this.fileParsesRemaining <= 0 )
    {
        this._saveData();
    }
};

//parses a single type within a single file. do not call this directly
EvnParse.prototype._parseType = function( typeData )
{
    var type = typeData.TypeCode[0];
    console.log( "parsing type " + type );
    
    if ( !this.results[ type ] )
    {
        this.results[ type ] = [];
    }
    
    var resourceIndex;
    var resources = typeData.ResourcesArray[0].Resource;
    for ( resourceIndex = 0; resourceIndex < resources.length; resourceIndex++ )
    {
        this._parseResource( resources[ resourceIndex ], this.results[ type ], type );
    }
};

//parses a single resource within a single type within a single file. do not call this directly
EvnParse.prototype._parseResource = function( resourceData, resourceArray, type )
{
    //base64 decode the data into useable string data
    var decodedData = atob( resourceData.ResourceData[0] );
    //then turn it into a byte array, which we'll parse through
    var dataBytes = this._stringToBytes( decodedData );
    
    var resource =
    {
        id: resourceData.ResourceID[0],
        name: resourceData.ResourceName[0],
        flags: resourceData.ResourceFlags[0],
        rawData: dataBytes
    };
    
    if ( this.includeRawData )
    {
        resource.rawString = decodedData;
    }
    
    if ( this.parsingTemplate )
    {
        this._interpretTemplateData( resource, type );
    }
    else
    {
        this._interpretData( resource, type );
    }
    
    resourceArray.push( resource );
};

//interprets the data for a single resource. this is relatively complicated, and based
//upon the ResEdit data types found here: https://developer.apple.com/legacy/library/documentation/mac/pdf/ResEditReference.pdf (pg 93)
//not all ResEdit types are included -- only those that are used by the EVN data files
//one additional type, Tnnn was added, as a fix for an edge case with flët/ActivateOn
EvnParse.prototype._interpretData = function( resource, type )
{
    resource.data = {};
    
    var template = this.templates[ type ];
    if ( template )
    {
        var byteOffset = 0;
        
        var elementIndex;
        for ( elementIndex = 0; elementIndex < template.length; elementIndex++ )
        {
            var element = template[ elementIndex ];
            var result = "UNRECOGNIZED TYPE";
            
            var temp = null;
            switch ( element.type )
            {
                case "DBYT":
                    result = this._bytesToNumber( resource.rawData.slice( byteOffset, byteOffset + 1 ) );
                    byteOffset += 1;
                    break;
                case "DWRD":
                    result = this._bytesToNumber( resource.rawData.slice( byteOffset, byteOffset + 2 ) );
                    byteOffset += 2;
                    break;
                case "DLNG":
                    result = this._bytesToNumber( resource.rawData.slice( byteOffset, byteOffset + 4 ) );
                    byteOffset += 4;
                    break;
                case "HBYT": 
                    result = this._bytesToHexString( resource.rawData.slice( byteOffset, byteOffset + 1 ) );
                    byteOffset += 1;
                    break;
                case "HWRD": 
                    result = this._bytesToHexString( resource.rawData.slice( byteOffset, byteOffset + 2 ) );
                    byteOffset += 2;
                    break;
                case "HLNG": 
                    result = this._bytesToHexString( resource.rawData.slice( byteOffset, byteOffset + 4 ) );
                    byteOffset += 4;
                    break;
                case "RECT":
                    result =
                    [
                        this._bytesToNumber( resource.rawData.slice( byteOffset    , byteOffset + 2 ) ),
                        this._bytesToNumber( resource.rawData.slice( byteOffset + 2, byteOffset + 4 ) ),
                        this._bytesToNumber( resource.rawData.slice( byteOffset + 4, byteOffset + 6 ) ),
                        this._bytesToNumber( resource.rawData.slice( byteOffset + 6, byteOffset + 8 ) )
                    ];
                    byteOffset += 8;
                    break;
                case "CSTR":
                    result = this._bytesToCString( resource.rawData.slice( byteOffset ) );
                    byteOffset += result.length + 1;
                    break;
                
            }
            
            //this doesn't necessarily mean we don't have a valid type...
            //we may also have one of the weird things that looks for fixed length strings
            if ( result === "UNRECOGNIZED TYPE" )
            {
                //strings of fixed length
                if ( element.type.indexOf( "C" ) === 0 || element.type.indexOf( "T" ) === 0  )
                {
                    var byteCount = parseInt( "0x" + element.type.substring( 1 ), 16 );
                    var newBytes = resource.rawData.slice( byteOffset, byteOffset + byteCount );
                    
                    if ( element.type.indexOf( "C" ) === 0 )
                    {
                        result = this._bytesToString( newBytes, true );
                    }
                    //custom type; I made it because ActivateOn has baffling bullshit.
                    //the same as "C", except if the first character is blank, returns an empty string.
                    //if it isn't, then returns a string until a blank character is reached (just like CSTR)
                    //however, it still moves on the same byteOffset amount
                    else if ( element.type.indexOf( "T" ) === 0 )
                    {
                        result = this._bytesToCString( newBytes );
                    }
                    byteOffset += byteCount;
                }
                //invalid type! gotta code that up
                else
                {
                    console.log( type + ": Unknown data type \"" + element.type + "\"! Everything beyond this will be broken." );
                }
            }
            
            //sometimes there are duped names, we must handle that
            var key = this._getNextAvailableKey( resource.data, element.name );
            resource.data[ key ] = result;
        }
    }
    //special case
    else if ( type === "STR#" )
    {
        resource.data = this._arrayFromBytes( resource.rawData );
    }
    
    if ( this.includeRawData )
    {
        resource.rawData = this._bytesToHexString( resource.rawData, " " );
    }
    else
    {
        delete( resource.rawData );
    }
};

//EVN sometimes uses the same name in templates twice.
//for those cases, this function gives a key name that won't trample anything else
EvnParse.prototype._getNextAvailableKey = function( data, desiredKey )
{
    var key = desiredKey;
    var lastAddedDigit = -1;
    while ( data[ key ] )
    {
        if ( lastAddedDigit < 0 )
        {
            key = desiredKey + "2";
            lastAddedDigit = 2;
        }
        else
        {
            key = desiredKey + ( lastAddedDigit + 1 );
            lastAddedDigit++; 
        }
    }
    
    return key;
};

//this is for creating a template file. give TMPL data, this function will
//interpret it into nice JS data.
EvnParse.prototype._interpretTemplateData = function( resource, type )
{
    resource.templates = [];
    var lastBlankOffset = -1;
    
    var byteOffset;
    for ( byteOffset = 0; byteOffset < resource.rawData.length; byteOffset++ )
    {
        //this is imperfect... 32 is ' ', and there appears to be a divider between values that
        //can be any non-character byte. not sure how it actually works... probably is the same array type that STR# uses
        if ( resource.rawData[ byteOffset ] < 32 )
        {
            if ( lastBlankOffset >= 0 )
            {
                var resourceString = this._bytesToString( resource.rawData.slice( lastBlankOffset + 1, byteOffset ) );
                if ( resourceString.length >= 4 )
                {
                    resource.templates.push(
                    {
                        "name": resourceString.substring( 0, resourceString.length - 4 ),
                        "type": resourceString.substring( resourceString.length - 4 )
                    });
                }
            }
            
            lastBlankOffset = byteOffset;
        }
    }
    
    delete( resource.rawData );
};

//converts an array of bytes into a string. each byte is expected to be one character.
//optionally, you can trim empty bytes from both ends (this is recommended in most
//cases, but is not default behavior)
EvnParse.prototype._bytesToString = function( bytes, trim )
{
    if ( trim )
    {
        var startIndex = 0;
        for ( startIndex = 0; startIndex < bytes.length; startIndex++ )
        {
            if ( bytes[ startIndex ] !== 0 )
            {
                break;
            }
        }
        
        var endIndex = 0;
        for ( endIndex = bytes.length - 1; endIndex >= 0; endIndex-- )
        {
            if ( bytes[ endIndex ] !== 0 )
            {
                break;
            }
        }
        
        bytes = bytes.slice( startIndex, endIndex + 1 );
        
        //str = str.replace(/^\0+/, '').replace(/\0+$/, '');
    }
    
    return String.fromCharCode.apply( null, bytes );
};

//goes through the bytes until one equals 0, then returns the string up to that point.
//you can use the length of the string to determine how many bytes we had to go through.
EvnParse.prototype._bytesToCString = function( bytes )
{
    var byteIndex;
    for ( byteIndex = 0; byteIndex < bytes.length; byteIndex++ )
    {
        if ( bytes[ byteIndex ] === 0 )
        {
            return this._bytesToString( bytes.slice( 0, byteIndex ) );
        }
    }
    
    return this._bytesToString( bytes );
};

//given a string, returns an array of bytes. each string character is considered a
//single byte. this function is important for parsing Rezilla's XML file data fields.
EvnParse.prototype._stringToBytes = function( str )
{
    var bytes = [];
    var i;
    for ( i = 0; i < str.length; i++ )
    {
        bytes.push( str.charCodeAt( i ) );
    }
    return bytes;
};

//converts an array of bytes into a number. by default, this expects a signed number.
//when signed, the number becomes negative once the value goes past half of the max.
EvnParse.prototype._bytesToNumber = function( x, signed )
{
    var val = 0;
    var i;
    for ( i = 0; i < x.length; ++i )
    {        
        val += x[i];        
        if ( i < x.length-1 )
        {
            val = val << 8;
        }
    }
    
    //if this is signed, we need to account for negatives
    //this involves getting half of the maximum, and then flipping the difference to negative
    if ( signed === undefined || signed === true )
    {
        var unsignedMax = Math.pow( 2, 8 * x.length );
        var max = Math.floor( ( unsignedMax - 1 ) / 2 );
        if ( val > max )
        {
            val = -1 * ( unsignedMax - val );
        }
    }
    
    return val;
};

//converts an array of bytes into a hex string. this is used for flags.
//you can also include a prettifier that goes between bytes, like a space.
//this is nice when you need to debug a really long hex string.
EvnParse.prototype._bytesToHexString = function( arr, prettifier )
{
    var result = "";
    var z;

    var i;
    for ( i = 0; i < arr.length; i++ )
    {
        var str = arr[i].toString(16);

        z = 8 - str.length + 1;
        str = new Array(z).join("0") + str;
        str = str.substring( 6 );

        result += str;
        
        if ( prettifier !== undefined )
        {
            result += prettifier;
        }
    }

    return result;
};

//for use with OCNT, LSTC, and LSTE
//the first byte is the number of elements
//the second byte is blank
//the third byte is the beginning of the first element
//at the beginning of each element is a single byte saying how many bytes that element is
//you can't know how long the array is in bytes until you call this.
//you can pass in an obj with { length: 0 } for byteCountObj to find the byte length afterwards
EvnParse.prototype._arrayFromBytes = function( bytes, byteCountObj )
{
    var elementCount = this._bytesToNumber( [ bytes[0] ], false );
    var elements = [];
            
    var nextWordOffset = -1;
    var startOffset = 2;
    var byteOffset;
    for ( byteOffset = startOffset; byteOffset < bytes.length; byteOffset++ )
    {
        if ( byteOffset >= nextWordOffset || byteOffset >= bytes.length - 1 )
        {
            if ( nextWordOffset >= 0 )
            {
                elements.push( this._bytesToString( bytes.slice( startOffset + 1, nextWordOffset ) ) );
            }
            
            if ( nextWordOffset < bytes.length )
            {
                startOffset = byteOffset;
                nextWordOffset = startOffset + bytes[ byteOffset ] + 1;
            }
        }
        
        if ( elements.length >= elementCount )
        {
            if ( byteCountObj )
            {
                byteCountObj.length = byteOffset;
            }
            break;
        }
    }
    
    return elements;
};

//this is the final function that is called. it will save the results to the disk.
EvnParse.prototype._saveData = function()
{
    var data = this.results;
    
    if ( this.parsingTemplate )
    {
        data = {};
        
        var templateIndex;
        for ( templateIndex = 0; templateIndex < this.results.TMPL.length; templateIndex++ )
        {
            data[ this.results.TMPL[ templateIndex ].name ] = this.results.TMPL[ templateIndex ].templates;
        }
    }
    
    fs.writeFileSync( this.exportPath, JSON.stringify( data, null, "\t" ) );
};

module.exports = new EvnParse();