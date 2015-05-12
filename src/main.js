/**
 * Checks to see if table is in setup mode or not.
 * This is determined by the presence of LOCK_FILE.
 * If LOCK_FILE not present, assume setup mode
 */

var fs = require('fs');
var isSetupMode = true;
var setup = null;


var Table = function()
{
  self = this;

  self.setupMode = function()
  {
	  console.log("Starting in setup mode");
	  setup = require(__dirname + '/lib/deviceconfig');
  };

  self.startNormal = function()
  {
     //TODO: Start up as normal
	 console.log( "Starting normally");  
  };

  self.initialise = function()
  {
	  //Check if lockfile environment variable has been set
	  var lockfile = process.env.LOCK_FILE;
	  
	  //If environment variable not set then bail out
	  if(! lockfile)
	  {
		  console.log("exiting: LOCK_FILE environment variable must be set.")
		  process.exit(1);
	  }
	  
	  //Check if the lockfile exists 
	  try
	  {
		  fs.statSync(lockfile);
		  isSetupMode = false;
	  }
	  catch(error)
	  {
		  isSetupMode = true;
	  }
	  
      
	  if(isSetupMode)
	  {
		  self.setupMode();
	  }
	  else
	  {
		  self.startNormal();
	  }
	  
  };

};

var app = new Table();

app.initialise();
