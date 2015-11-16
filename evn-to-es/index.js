/*global require*/
/*global console*/

var argv = require( "argv" );

//to add new porters, add them to this list
//use the name of the .js file, minus the extension
var porters =
[
    "outfits"
];

var args = argv.option(
[
    //where evndata.json lives
    {
        name: "source",
        short: "s",
        type: "path"
    },
    //the plugins folder to export to. will look for a /data folder inside that
    {
        name: "exportPath",
        short: "e",
        type: "path"
    },
    //the porter(s) to use, defaults to "all", or you can put the name of any porter(s), like "outfits"
    {
        name: "porters",
        short: "p",
        type: "list,string"
    }
]).run().options;

if ( !args.source || !args.exportPath )
{
    console.log( "node evn-to-es -s <path/to/evndata.json> -e <path/to/export/folder> [-p <porterName>]" );
    console.log( "If no porter name is provided, all porters are executed (same as executing -p all)" );
}
else
{
    var usedPorters = porters;
    if ( args.porters )
    {
        usedPorters = args.porters;
    }
    
    //for convenience, if the user didn't specify a path with /data, add it for them
    var exportPath = args.exportPath;
    var dataIndex = args.exportPath.indexOf( "/data" );
    //for either /data or /data/
    if ( dataIndex !== args.exportPath.length - "/data".length && dataIndex !== args.exportPath.length - "/data".length - 1 )
    {
        exportPath = args.exportPath + "/data";
    } 
    
    var porterIndex;
    for ( porterIndex = 0; porterIndex < usedPorters.length; porterIndex++ )
    {
        require( "./" + usedPorters[ porterIndex ] + ".js" ).port( args.source, exportPath );
    }
}