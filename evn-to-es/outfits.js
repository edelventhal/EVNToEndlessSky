/*global require*/
/*global module*/
/*global console*/
/*global __filename*/

var fs = require( "fs" );
var portUtility = require( "./portUtility.js" );

//ports oütf resources to Endless Sky text files.
//requires evndata.json to exist in the same directory.
//TODO - TechLevel. That will need to be tied in with "outfitter" and "shipyard" elements in ES.
//  multiple of those will need to exist to accomodate each government / tech level combination.
//TODO - Availability, OnPurchase, Contributes, OnSell. These are horrible bit flags that awkwardly link
//  to other flags with your ship, outfits, missions, blah blah.
//example data:
/*
		{
			"id": "128",
			"name": "Light Blaster",
			"flags": "0",
			"data": {
				"DispWeight": 100,
				"Mass": 3,
				"TechLevel": 4,
				"ModType": 1,
				"ModVal": 128,
				"Max": 8,
				"Flags": "0001",
				"Cost": 5000,
				"ModType2": -1,
				"ModVal2": 0,
				"ModType3": -1,
				"ModVal3": 0,
				"ModType4": -1,
				"ModVal4": 0,
				"Contributes": "00000000",
				"Contributes2": "00000000",
				"Requires": "00000000",
				"Requires2": "00000001",
				"Availability": "",
				"OnPurchase": "",
				"OnSell": "",
				"ShortName": "Light Blaster",
				"LCName": "light blaster",
				"LCPlural": "light blasters",
				"ItemClass": 0,
				"ScanMask": "0000",
				"BuyRandom": 100,
				"RequireGovt": 127,
				"Unused": 0
			}
		}
*/
var OutfitPorter = function()
{
    //What the flag values mean from the data.Flags value
    // 0x0001 - This item is a fixed gun
    // 0x0002 - This item is a turret
    // 0x0004 - This item stays with you when you trade ships (persistent)
    // 0x0008 - This item can't be sold
    // 0x0010 - Remove any items of this type after purchase (useful for permits and other intangible purchases)
    // 0x0020 - This item is persistent in the case where the player's shïp is changed by a mission set operator. The item's normal persistence for when the player buys or captures a new shïp is still controlled by the 0x0004 bit.
    // 0x0100 - Don't show this item unless the player meets the Require bits, or already has at least one of it.
    // 0x0200 - This item's total price is proportional to the player's ship's mass. (ship class Mass field is multiplied by this item's Cost field)
    // 0x0400 - This item's total mass (at purchase) is proportional to the player's ship's mass. (ship class Mass field is multiplied by this item's Mass field and then divided by 100)
    // 0x0800 - This item can be sold anywhere, regardless of tech level, requirements, or mission bits.
    // 0x1000 - When this item is available for sale, it prevents all higher-numbered items with equal DispWeight from being made available for sale at the same time.
    // 0x2000 - This outfit appears in the Ranks section of the player info dialog instead of in the Extras section.
    // 0x4000 - Don't show this item unless its Availability evaluates to true, or if the player already has at least one of it.
    this.flagGunStrings =
    {
        "1" : "Guns",
        "2" : "Turrets"
    };
    
    this.categoryStrings =
    {
        1  : "Weapon",      //a weapon    The ID number of the associated wëap resource
        2  : "Systems",     //more cargo space    The number of tons of cargo space to add
        3  : "Ammunition",  //  ammunition    The ID number of the associated wëap resource
        4  : "Systems",     //more shield capacity    The number of shield points to add
        5  : "Systems",     //faster shield recharge    How much to speed up (1000 = one more shield point per frame)
        6  : "Systems",     //armor    The number of armor points to add
        7  : "Systems",     //acceleration booster    Amount of accel to add (see shïp for more info)
        8  : "Systems",     //speed increase    Amount of speed to add (see shïp for more info)
        9  : "Systems",     //turn rate change    Amount of turn change (100 = 30*/sec)
        10 : "Unused",      //unused
        11 : "Systems",     //escape pod    ignored
        12 : "Systems",     //fuel capacity increase    Amount of extra fuel (100 = 1 jump)
        13 : "Systems",     //density scanner    ignored
        14 : "Systems",     //IFF (colorized radar)    ignored
        15 : "Engines",     //afterburner    How much fuel to use (units/sec)
        16 : "Special",     //map ModVal: >= 1: How many jumps away from present system to explore, -1: Explore all inhabited independent systems, <= -1000 Explore all systems of abs( ModVal + 1000 ) government class
        17 : "Systems",     //cloaking device:  ModVal:  0x0001 - Faster fading, 0x0002 - Visible on radar, 0x0004 - Immediately drops shields on activation, 0x0008 - Cloak deactivates when ship takes damage, 0x0010 - Use 1 unit of fuel per second, 0x0020 - Use 2 units of fuel per sec, 0x0040 - Use 4 units of fuel per sec, 0x0080 - Use 8 units of fuel per sec, 0x0100 - Use 1 unit of shield per sec, 0x0200 - Use 2 units of shield per sec, 0x0400 - Use 4 units of shield per sec, 0x0800 - Use 8 units of shield per sec, 0x1000 - Area cloak - ships in formation with a shïp carrying this cloaking device will also be cloaked
        18 : "Systems",     //fuel scoop    How many frames per 1 unit of fuel generated. Enter a negative value to perform the same function in "fuel sucking" mode
        19 : "Systems",     //auto-refueller    ignored
        20 : "Systems",     //auto-eject    ignored (requires escape pod to work)
        21 : "Special",     //clean legal record    ID of gövt to clear legal record with, or -1 for all
        22 : "Systems",     //hyperspace speed mod    Number of days to increase or decrease ship's hyperspace travel time (still can't go below 1 day/jump)
        23 : "Systems",     //hyperspace dist mod    Amount to increase or decrease the no-jump zone's radius by (the standard radius is 1000)
        24 : "Systems",     //interference mod    Subtracts the value in ModVal from the current star system's Interference value when calculating how "fuzzy" to make the radar scanner
        25 : "Hand to Hand",//marines    Adds the value in ModVal to your ship's effective crew complement when calculating capture odds 1 and up Add this number to the player's ship's effective crew size -1 to -100 Increase the player's capture odds by this amount (e.g. -5 is an increase of 5%)
        26 : "Unused",     //(ignored)
        27 : "Systems",    //increase maximum    The ID number of another outfit item, (call it "B") whose maximum value is to be increased. Item B's standard maximum will be multiplied by the number of items the player has that have a ModType of 27 and point to B. If the player owns no items that modify the maximum of item B, its maximum will be unchanged.
        28 : "Systems",    //murk modifier    The amount by which to increase or decrease the current system's murkiness level
        29 : "Systems",    //faster armor recharge    How much to speed up (1000 = one more armor point per frame)
        30 : "Systems",    //cloak scanner    0x0001 - reveal cloaked ships on radar, 0x0002 - reveal cloaked ships on the screen, 0x0004 - allow targeting of untargetable ships, 0x0008 - allow targeting of cloaked ships
        31 : "Systems",    //mining scoop
        32 : "Systems",    //multi-jump    number of extra jumps to perform when the user initiates a hyperspace jump
        33 : "Systems",    //Jamming Type 1    amount of jamming to add or subtract
        34 : "Systems",    //Jamming Type 2    amount of jamming to add or subtract
        35 : "Systems",    //Jamming Type 3    amount of jamming to add or subtract
        36 : "Systems",    //Jamming Type 4    amount of jamming to add or subtract
        37 : "Systems",    //fast jumping    (grants carrying shïp the ability to enter hyperspace without slowing down)
        38 : "Systems",    //inertial dampener    (makes shïp inertialess)
        39 : "Systems",    //ion dissipator    amount of deionization to add. 100 equals 1 point of ion energy per 1/30th of a second. Higher values yield faster ion charge dissipation.
        40 : "Systems",    //ion absorber    amount of extra ionization capacity to add
        41 : "Systems",    //gravity resistance
        42 : "Systems",    //resist deadly stellars
        43 : "Systems",    //paint    the color to paint the player's shïp, encoded as a 15-bit color value, where the bits are: 0RRRRRGGGGGBBBBB (this is necessary because the ModVal field isn't big enough to hold a 32-bit HTML color value)
        44 : "Systems",    //reinforcement inhibitor    a gövt class value. any gövt with this value in its Class1-4 fields will be prevented from calling in reinforcements while the player is in the system and has this outfit. setting this field to -1 will inhibit reinforcements for all ships regardless of gövt. note that this outfit will only work when carried by the player.
        45 : "Systems",    //modify max guns    add/subtract from max number of guns
        46 : "Systems",    //modify max turrets    add/subtract from max number of turrets
        47 : "Systems",    //bomb    destroys the player in flight. set the modval to the ID of the dësc resource to show after the player is destroyed, or -1 for none.
        48 : "Systems",    //IFF scrambler    a gövt class value. any gövt with this value in its Class1-4 fields will fooled into thinking the player is a friendly shïp and will not attack without provocation. note that this outfit will only work when carried by the player.
        49 : "Systems",    //repair system    will occasionally repair the shïp when it's disabled
        50 : "Systems"     //nonlethal bomb    randomly destroys itself and damages the player (nonfatally) in flight. set this field to the ID of a bööm resource to display when an item of this type self-destructs
    };
};

OutfitPorter.prototype.port = function( dataJsonPath, pluginsFolder )
{
    //we'll use the evndata JSON as a source
    var evndata = portUtility.getEvnData( dataJsonPath );

    //we need to make a lookup object for the descriptions
    var descLookup = portUtility.getDescLookup( evndata );

    //we will also need to make a lookup object for any weap resources that outf needs
    var weapLookup = portUtility.getLookupForType( evndata, "wëap" );

    //manual porting data
    var manualData = JSON.parse( fs.readFileSync( __filename.substring( 0, __filename.lastIndexOf( "/" ) ) + "/manualData/outfits.json", "utf8" ) );

    //we'll append to this Endless Sky data array as we parse through everything
    var esData = portUtility.createESData();

    //go through all the outfits
    var outfitLookup = {};
    var outfits = evndata[ "oütf" ];
    var outfitIndex;
    for ( outfitIndex = 0; outfitIndex < outfits.length; outfitIndex++ )
    {
        var outfit = outfits[ outfitIndex ];
        var outfitName = this._getOutfitName( outfit );
    
        if ( !outfitLookup[ outfitName ] ) //TODO - we need to handle the weird duplicates somehow
        {
            var descObj = descLookup[ Math.floor( outfit.id ) + 2872 ];
            var desc = "No Description.";
            if ( descObj )
            {
                desc = descObj.data.Description;
                desc = desc.replace( /\r/g, " " ).replace( /\n/g, " " ).replace( /\"/g, "'" );
            }
            esData.append( this._outfitToEsData( outfit.id, outfitName, outfit.data, desc, weapLookup, manualData ) );
        
            outfitLookup[ outfitName ] = true;
        }
    }

    //now we need to add them all to an outfits list. this is temporary, it will need to be changed later,
    //putting them all into different technology level / government buckets
    esData.add( "outfitter", "Common Outfits", 0 );
    for ( outfitIndex = 0; outfitIndex < outfits.length; outfitIndex++ )
    {
        esData.add( this._getOutfitName( outfits[ outfitIndex ] ) );
    }

    //write them to a text file
    portUtility.savePluginData( pluginsFolder, "outfits", esData.toString() );
};

OutfitPorter.prototype._getOutfitName = function( outfit )
{
    return outfit.name.replace( /\\n/g, " " );
};

OutfitPorter.prototype._getCategory = function( data )
{
    if ( data.ModType === 1 )
    {
        return this.flagGunStrings[ data.Flags.charAt( data.Flags.length - 1 ) ];
    }
    return this.categoryStrings[ data.ModType ];
};

OutfitPorter.prototype._outfitToEsData = function( id, name, data, description, weapLookup, manualData )
{
    var esData = portUtility.createESData();
    
    esData.add( "outfit", name, 0 );
    
    esData.add( "category", this._getCategory( data ), 1 );
    esData.add( "cost", data.Cost, 1 );
    esData.add( "thumbnail", "outfit/" + name.replace( / /g, "_" ).toLowerCase(), 1 );
    
    //endless sky doesn't care about certain tags existing or not, and blindly shows whatever tags exist
    //so, we don't want to add a tag if it has a value of 0
    if ( data.Mass !== 0 )
    {
        esData.add( "outfit space", -1 * data.Mass , 1);
        esData.add( "mass", data.Mass, 1 );
    }
    
    //TODO - maximum count (data.Max). does ES not have this?
    
    //weapons
    if ( data.ModType === 1 )
    {
        esData.append( this._weapToEsData( name, data, weapLookup, manualData ) );
    }
    
    esData.add( "description", description, 1 );
    
    return esData;
};

/*
Sample wëap data
{
	"id": "234",
	"name": "Radar Missile",
	"flags": "0",
	"data": {
		"Reload": 30,
		"Count": 110,
		"MassDmg": 40,
		"EnergyDmg": 20,
		"Guidance": 1,
		"Speed": 1100,
		"AmmoType": 7,
		"Graphic": 4,
		"Inaccuracy": 1,
		"Sound": 13,
		"Impact": 650,
		"ExplodType": 0,
		"ProxRadius": 4,
		"BlastRadius": 20,
		"Flags": "8002",
		"Seeker": "000a",
		"SmokeSet": -1,
		"Decay": 0,
		"Particles": 2,
		"PartVel": 30,
		"PartLifeMin": 50,
		"PartLifeMax": 60,
		"PartColor": "00a0a080",
		"BeamLength": 0,
		"BeamWidth": 0,
		"Falloff": 0,
		"BeamColor": "00000000",
		"CoronaColor": "00000000",
		"SubCount": 0,
		"SubType": -1,
		"SubTheta": 0,
		"SubLimit": 0,
		"ProxSafety": 0,
		"Flags2": "1000",
		"Ionization": 0,
		"HitParticles": 12,
		"HitPartLife": 13,
		"HitPartVel": 850,
		"HitPartColor": "00ffbf00",
		"Recoil": 0,
		"ExitType": 2,
		"BurstCount": 0,
		"BurstReload": 0,
		"JamVuln1": 0,
		"JamVuln2": 100,
		"JamVuln3": 0,
		"JamVuln4": 0,
		"Flags3": "0000",
		"Durability": 8,
		"GuidedTurn": 60,
		"MaxAmmo": -1,
		"LiDensity": 0,
		"LiAmplitude": 0,
		"IonizeColor": "00000000",
		"Unused": 0
	}
}
*/
OutfitPorter.prototype._weapToEsData = function( name, data, weapLookup, manualData )
{
    var esData = portUtility.createESData();
    
    var flag = data.Flags.charAt( data.Flags.length - 1 );
    if ( flag === "1" )
    {
        esData.add( "gun ports", -1, 1 );
    }
    else if ( flag === "2" )
    {
        esData.add( "turret mounts", -1, 1 );
    }
    esData.add( "weapon capacity", -1 * data.Mass, 1 );
    //TODO - required crew? it's in ES, not in EV
    
    var weap = weapLookup[ data.ModVal ];
    if ( !weap )
    {
        console.log( "WARNING: Unable to find wëap resource of ID " + data.ModVal + " for oütf: " + name );
    }
    else
    {
        esData.add( "weapon" );
        
        //default data
        var visualData =
        {
            "sprite": "projectile/" + name.toLowerCase().replace( " ", "_" ),
            "sound": name.toLowerCase().replace( " ", "_" ),
            "hit effect": "blaster impact"
        };
        
        //manually entered data
        var md = manualData[ "wëap" ][ name ];
        if ( md )
        {
            if ( typeof( md ) === "string" )
            {
                md = manualData[ "wëap" ][ md ];
            }
            else
            {
                visualData = md;
            }
        }
        
        weap = weap.data;
        esData.add( "sprite", visualData.sprite, 2 );
        esData.add( "sound", visualData.sound, 2 );
        esData.add( "hit effect", visualData[ "hit effect" ], 2 );
        esData.add( "inaccuracy", weap.Inaccuracy, 2 );
        esData.add( "velocity", weap.Speed / 200, 2 ); //hmmm, not sure how this, accel, and drag will work... 200 is arbitrary
        esData.add( "acceleration", 0, 2 );
        esData.add( "drag", 0, 2 );
        esData.add( "lifetime", weap.Count * 2, 2 ); //converting 30fps into 60fps
        esData.add( "reload", weap.Reload * 2, 2 ); //converting 30fps to 60fps
        esData.add( "firing energy", 0, 2 ); //evn did not have energy
        esData.add( "firing heat", 0, 2 ); //evn did not have heat
        esData.add( "shield damage", weap.EnergyDmg, 2 );
        esData.add( "hull damage", weap.MassDmg, 2 );
        
    }
    
    return esData;
};

module.exports = new OutfitPorter();