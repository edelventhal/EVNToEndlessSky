# png-rounder
Endless Sky outfit thumbnails are meant to be isolated images surrounded by transparent space. Escape Velocity Nova thumbnails are square. It would take a lot of manual effort to edit every thumbnail to look perfect in the ES shop. In addition, unless there is at least one transparent pixel in the outfit thumbnail, Endless Sky will do a wonky transparency filter to the image. So, this script will save new PNGs that have a rounded rect of transparency around the thumbnail, making it look at least passable in the ES shop.

    node png-rounder -s <path/to/pngs/folder> -e <path/to/export/folder>

You can pass in either a folder or multiple individual files for the source option.