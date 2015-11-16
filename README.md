# EVNToEndlessSky
Contains scripts and resources for porting the entirety of Escape Velocity Nova to the open source game Endless Sky. It is very much in-progress, and some elements will never adapt perfectly due to gameplay differences.

### evnparse
The data is pulled from EVN through a few steps. First, the Mac OS X open source application, Rezilla (https://sourceforge.net/projects/rezilla/) is used to open up the EVN Data files (they can be found by viewing package contents in EV Nova.app) and then export the data to an XML "map".

These XML map files can be found in the novaExports/dataXML folder in this repository. The format of the map files is such that all of the byte data for a given entry is base64 encoded.

Next, we must get the template data that specifies how the bytes are packed in each type of EVN data. Once again, we use Rezilla to export the TMPL resource data into another XML file. The result can be found in novaExports/templatesXML in this repository.

evnparse, a node.js script, can then be used to go through all this data and turn it into a single monolithic JSON data file (hundreds of thousands of lines long!). First, evnparse needs useable template data, which means taking the template XML and turning it into JSON.

    node evnparse path/to/EVNTemplates.xml -t path/to/templates.json

This will save a new JSON file that is a useable version of the templates XML file, at the path you specified. There is already a templates.json found at resourceTemplates/templates.json that can be used. If you need to replace it, you would run the command like this:

    node evnparse novaExports/templatesXML/EVNTemplates.xml -t resourceTemplates/templates.json

Note that there is one **very important exception** with the templates export. Due to a data aberration in flët/ActivateOn, you must manually change this element's type from "C100" to "T100". The *Cnnn* data type says that a C string will be found over the next nnn bytes in the data. However, in the isolated case of flët/ActivateOn, there appears to be junk data within those nnn bytes. Instead the data appears to behave more like a *CSTR* data type, where the string persists until a null byte is found. Because of this, I've added a "fake" data type that does not normally exist in ResEdit: *Tnnn*. It behaves like a *CSTR* type, except it advances the active byte index nnn bytes, thereby skipping the junk data. So, if you need to re-export the template data for some reason, be sure to make this manual change afterwards.

After the template data is ready, then an actual data dump can be made.

    node evnparse path/to/dataXML/folder -e path/to/resultData.json

This will parse all of the data XML files found in the passed folder, combine all their data, and then put it into the target JSON file. You may also pass a single file to the first parameter.

Note that there is one **known bug** that will happen if you try to parse all 6 files at once. node.js will throw an exception and the process will fail. It's unclear why this is, it may be that there is such a huge amount of data that node.js can't handle it. The solution is to parse 5 files at once, then the sixth file separately. Then, manually combine the two result JSONs into a single one. Not optimal, but there it is.

An already parsed JSON can be found at parsedData/evndata.json . If you need to replace it, you would run the command like this:

    node evnparse novaExports/dataXML -e parsedData/evndata.json

But, remember, this is likely to fail unless you temporarily take one of the XML files out of the dataXML folder, then call the command on that file separately and manually combine the two result JSONs.

The data types in evnparse are interpreted using the rules found in the ResEdit Reference, located here:
https://developer.apple.com/legacy/library/documentation/mac/pdf/ResEditReference.pdf
On page 93 of the PDF file (and "page 78" of the reference).

If for some reason a new type needs to be added, it's easiest to follow these rules, and sanity check them against the raw Hex in Rezilla, comparing those values with the ones MissionComputer gives. MissionComputer can be found here: http://www.ambrosiasw.com/assets/modules/addonfiles/download.php?addon=2223

### Using the parsed data to create Endless Sky plugin data
Endless Sky's plugins are in a nice, easy to understand text file format. EVN's data is practically the opposite. Aside from the large effort needed to even get the data in a nice-to-read format (which is fortunately already done via Rezilla and evnparse), the data itself is totally a rat's nest. It relies on esoteric usage of flags, mission bits, reserved characters, and other wonkiness. Thus, even figuring out how to interpret the data is challenge enough.

On top of this, Endless Sky doesn't have all the same features as Escape Velocity Nova. This applies in both directions - ES has some features that EVN is missing, and EVN has features that ES does not have. Examples include ES's engine and gun-specific outfit space, or EVN's limits on how many of an individual outfit you can purchase.

All that being said, the games are similar enough that it should be totally possible to, 95% through automation, convert EVN's data to ES data. After all, that's the intention and end goal of this project.

Accomplishing this can be done through multiple scripts found in the evn-to-es folder. There is one script per data type that needs to be ported over. In many cases, a single data type will need to read many other data types to port. For example, oütf must read from both dësc and wëap types. Since all the data exists in the giant data JSON, this is trivial.

All scripts can also be executed with one command, using the index.js script.

    node evn-to-es path/to/evndata.json path/to/output/plugins/folder

Or, to execute just a single data type:

    node evn-to-es/outfits.js path/to/output/plugins/folder

Theoretically, a txt file will be created for each data type, and you can then drop that txt in your Endless Sky plugins folder and watch it go. See the Endless Sky plugins reference here for the folder format to have and where on the disk to put them: https://github.com/endless-sky/endless-sky/wiki/CreatingPlugins

All of the most recent exports exist within the esPlugins/ folder. Simply copy all the contents of this folder into the Endless Sky plugins folder to try them out.

### Writing more data type porters
This project absolutely could use help. Please write more type porters! Porting absolutely everything is a pretty massive undertaking, and then even when it's all ported there will be a lot of manual data tweaking that will need to occur. 

There are currently very few rules as to how a data porter should be written. Mainly, it should take parameters in the proper way when called from the command line, and should be a node.js module so that index.js can execute it. It should also exist in the evn-to-es/ folder, and be named the same as the final txt file it will create. Example being: outfits.js which creates outfits.txt.

More to come.