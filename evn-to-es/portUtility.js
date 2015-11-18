/*global require*/
/*global module*/

var fs = require( "fs" );

var PortUtility = function() {};

//given a path, returns EVN data (basically just a JSON parse)
PortUtility.prototype.getEvnData = function( dataJsonPath )
{
    return JSON.parse( fs.readFileSync( dataJsonPath, "utf8" ) );
};

//returns a dictionary for dësc with each element's ID as the key
PortUtility.prototype.getDescLookup = function( evndata )
{
    return this.getLookupForType( evndata, "dësc" );
};

//returns a dictionary for a certain type with each element's ID as the key
PortUtility.prototype.getLookupForType = function( evndata, type )
{
    var lookup = {};
    var index;
    for ( index = 0; index < evndata[ type ].length; index++ )
    {
        lookup[ evndata[ type ][ index ].id ] = evndata[ type ][ index ];
    }
    
    return lookup;
};

//saves a plugin file to the proper place on the disk
PortUtility.prototype.savePluginData = function( pluginsFolder, parserName, dataString )
{
    fs.writeFileSync( pluginsFolder + "/" + parserName + ".txt", dataString );
};

//you don't NEED to use an ESDataArray, but it's more convenient
var ESDataArray = function()
{
    this.length = 0;
};

ESDataArray.prototype.push = function( val )
{
    this[ this.length ] = val;
    this.length++;
};

//adds Endless Sky data to the array
ESDataArray.prototype.add = function( key, value, indent )
{
    this.push( { key: key, value: value, indentLevel: indent } );
};

//appends one ESDataArray to another
ESDataArray.prototype.append = function( otherEsData )
{
    var index;
    for ( index = 0; index < otherEsData.length; index++ )
    {
        this.push( otherEsData[ index ] );
    }
};

//turns the ESDataArray into a string by looping through all
//the elements, applying their indent levels, and then printing
//their key/value as space-separated data
ESDataArray.prototype.toString = function()
{
    var str = "";
    
    var index;
    for ( index = 0; index < this.length; index++ )
    {
        var obj = this[ index ];
        str = str.appendESData( obj.key, obj.value, obj.indentLevel );
        
        if ( index < this.length - 1 && this[ index + 1 ].indentLevel === 0 )
        {
            str += "\n";
        }
    }
    
    return str;
};

PortUtility.prototype.createESData = function()
{
    return new ESDataArray();
};

module.exports = new PortUtility();

//for adding Endless Sky data to a big data string. you can say str = str.appendESData( key, value, indentLevel )
//to add the relevant Endless Sky data to the string in the proper way. returns a new string.
//the default indent level is 1.
String.prototype.appendESData = function( key, value, indentLevel )
{
    indentLevel = indentLevel === undefined ? 1 : indentLevel;
    
    var str = this;
    
    var indent;
    for ( indent = 0; indent < indentLevel; indent++ )
    {
        str += "\t";
    }
    
    // if ( key.indexOf( " " ) >= 0 )
    // {
        str += "\"" + key + "\"";
    // }
    // else
    // {
    //     str += key;
    // }
    
    if ( value !== undefined )
    {
        str += " ";
        
        var type = typeof( value );
        if ( type === "string" )
        {
            str += "\"" + value + "\"";
        }
        else if ( type === "number" || type === "boolean" )
        {
            str += value;
        }
    }
    
    str += "\n";
    
    return str;
};