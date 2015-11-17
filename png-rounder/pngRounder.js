/*global require*/
/*global console*/
/*global module*/

var fs = require('fs');
var PNG = require('node-png').PNG;

var PngRounder = function()
{
    //the radius of the corners of the rounded rect. this is multiplied by the
    //min(width,height) of the image, so a value of 0.5 would create a circle.
    //generally, you want values above 0.5, since that creates a rounded rect.
    //values <= 0.5 create smaller and smaller circles
    this.radiusFactor = 0.55;
    
    //how far in we bring the edge (crop). this is also multiplied by the same
    //dimension value as the radiusFactor. 0.5 would crop the entire image.
    //remember this is cropped from both sides of the image, so total amount cropped
    //is 2 * this value.
    this.edgeSizeFactor = 0.05;
};

//rounds all the PNGs found in the array of search paths. if the search paths
//have any folders, those are expanded (but not recursively).
//exportPath is the folder where the new PNGs will be placed.
PngRounder.prototype.roundPngs = function( sourcePaths, exportPath )
{
    var files = this._findFileList( sourcePaths );
    
    var fileIndex;
    for ( fileIndex = 0; fileIndex < files.length; fileIndex++ )
    {
        this._roundPng( files[ fileIndex ], exportPath );
    }
};

//takes an array of source paths and expands any that are folders
PngRounder.prototype._findFileList = function( sourcePaths )
{
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
                if ( subFile.substring( subFile.lastIndexOf( "." ) + 1 ).toLowerCase() === "png" )
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
    
    return files;
};

//rounds a single PNG found at path, and puts the new one at exportPath/filename.png
PngRounder.prototype._roundPng = function( path, exportPath )
{
    var radiusFactor = this.radiusFactor;
    var edgeSizeFactor = this.edgeSizeFactor;
    var fileName = path.substring( path.lastIndexOf( "/" ) + 1 );
    
    fs.createReadStream( path ).pipe( new PNG({filterType: 4}) ).on('parsed', function()
    {
        var center = { x: Math.floor( this.width / 2 ), y: Math.floor( this.height / 2 ) };
        var radius = radiusFactor * Math.min( this.width, this.height );
        
        var edgeSize = { width: edgeSizeFactor * this.width, height: edgeSizeFactor * this.height };
        var imageRect = { minX: edgeSize.width,
                          minY: edgeSize.height,
                          maxX: this.width  - edgeSize.width,
                          maxY: this.height - edgeSize.height };
        
        var x;
        var y;
        for ( y = 0; y < this.height; y++ )
        {
            for ( x = 0; x < this.width; x++ )
            {
                var idx = (this.width * y + x) << 2;
                var transparentPixel = false;
                
                if ( x < imageRect.minX || y < imageRect.minY || x > imageRect.maxX || y > imageRect.maxY )
                {
                    transparentPixel = true;
                }
                else
                {
                    var diff = { x: x - center.x, y: y - center.y };
                    var dist = Math.sqrt( diff.x * diff.x + diff.y * diff.y );
                
                    if ( dist > radius )
                    {
                        transparentPixel = true;
                    }
                }
                
                if ( transparentPixel )
                {
                    //this is the alpha value (values are packed in 4s: RGBA in the data array)
                    this.data[idx+3] = 0;
                }
            }
        }

        this.pack().pipe( fs.createWriteStream( exportPath + "/" + fileName ) );
    });
};

module.exports = new PngRounder();