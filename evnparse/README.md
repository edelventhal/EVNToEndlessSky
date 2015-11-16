# evnparse
Parses XML exports created with Rezilla of Escape Velocity Nova data. Turns it into a useable JSON file for porting the data later. Requires a template file to do this properly.

Usage:

    cd evnparse
    node . -s path/to/dataXML/folder -e path/to/resultData.json

Reads all the data XML files found in the passed folder, parses them, and then puts the data into the chosen JSON. **Warning**: this can fail if too much data is parsed at once. You may need to parse files in a couple batches and then manually combine the two JSON files.

    cd evnparse
    node . -s path/to/dataFile.xml -e path/to/resultData.json

Reads a single data XML file, parses it, and then puts the data into the chosen JSON.

    cd evnparse
    node . -s path/to/templateData.xml -t path/to/templates.json

Reads TMPL resources that were exported with Rezilla, and creates a template file at the chosen location. This can be used for subsequent parsing.

For more details, see the main readme.