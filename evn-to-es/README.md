#evn-to-es
Ports Escape Velocity Nova data to Endless Sky plugin data. Requires that the EVN data was already exported into a readable JSON format.

Usage:

    cd evn-to-es
    node . path/to/evndata.json path/to/output/plugins/folder

That would call all porting scripts that exist, and put all the results in the chosen plugins folder.

Calling a specific porter:

    cd evn-to-es
    node outfits.js path/to/evndata.json path/to/output/plugins/folder

That would port only the outfits to the chosen plugins folder.

More details can be found in the main README file.