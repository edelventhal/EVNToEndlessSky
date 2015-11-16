/*global require*/
/*global module*/

var fs = require( "fs" );

var PortUtility = function() {};

PortUtility.prototype.getEvnData = function( dataJsonPath )
{
    return JSON.parse( fs.readFileSync( dataJsonPath, "utf8" ) );
};

PortUtility.prototype.getDescLookup = function( evndata )
{
    var descLookup = {};
    var descIndex;
    for ( descIndex = 0; descIndex < evndata[ "dësc" ].length; descIndex++ )
    {
        descLookup[ evndata[ "dësc" ][ descIndex ].id ] = evndata[ "dësc" ][ descIndex ];
    }
    
    return descLookup;
};

PortUtility.prototype.savePluginData = function( pluginsFolder, parserName, dataString )
{
    fs.writeFileSync( pluginsFolder + "/" + parserName + ".txt", dataString );
};

module.exports = new PortUtility();