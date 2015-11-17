/*global require*/
/*global console*/

var argv = require( "argv" );
var pngRounder = require( "./pngRounder.js" );

var args = argv.option(
[
    //where the source image files are
    {
        name: "source",
        short: "s",
        type: "list,path"
    },
    //the images folder to export to.
    {
        name: "exportPath",
        short: "e",
        type: "path"
    }
]).run().options;

if ( !args.source || !args.exportPath )
{
    console.log( "node png-rounder -s <path/to/images/folder> -e <path/to/export/folder>" );
}
else
{
    pngRounder.roundPngs( args.source, args.exportPath );
}