/*global require*/
/*global console*/

var evnParse = require( "./evnParse.js" );
var argv = require( "argv" );

var args = argv.option(
[
    {
        name: "source",
        short: "s",
        type: "list,path"
    },
    {
        name: "templatePath",
        short: "t",
        type: "path"
    },
    {
        name: "exportPath",
        short: "e",
        type: "path"
    },
    {
        name: "includeRawData",
        short: "raw",
        type: "boolean"
    }
]).run().options;

if ( !args.source || !args.templatePath )
{
    console.log( "node evnparse -s <path/to/evnDataXMLFolder> -t <path/to/result/template.json> [-e <path/to/result/evndata.json>]" );
    console.log( "To export new templates, do not provide an exportPath (-e) option, and point -s to the templates XML.");
    console.log( "To export new data instead, provide -e, and point -s to the XML data file." );
    console.log( "You can also include the raw data in the file if you add '-raw true'. This is only useful for debugging." );
}
else
{
    if ( args.exportPath )
    {
        evnParse.loadTemplates( args.templatePath );
    }
    
    evnParse.includeRawData = args.includeRawData;
    
    evnParse.parse( args.source, args.exportPath ? args.exportPath : args.templatePath );
}