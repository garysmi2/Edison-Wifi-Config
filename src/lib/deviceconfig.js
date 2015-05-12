var Discover = require('node-discover');
var discover = Discover();
var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');
var exec = require('child_process').exec;

/** 
 * node-discover events - as this is the actual
 * device we're not particularly interested in them
 * but catch them anyway
 */
discover.on("promotion", function()
{
     console.log("I was promoted as master");
});

discover.on("demotion", function()
{
    console.log("I was demoted from being a master");
});

discover.on("added", function(obj)
{
     console.log("A new node has been added");
     console.log(obj);
});

discover.on("removed", function(obj)
{
    console.log("A node has been removed");
    console.log(obj);
});

discover.on("master", function(obj)
{
    console.log("A new master is in control");
    console.log(obj);
});

var receivedConfig =
{
    'deviceName' : '',
    'ssid' : '',
    'networkType' : '',
    'password' : 'hellothere'
};



/**
 *  Checks if we have the required paramters
 *  for device configuration
 *
 *  Required Parameters are:
 *      name - the name the device shall be known as (effectively the hostname)
 *      ssid - name of wireless network to connect to
 *      type - the type of encryption ie. WEP, OPEN, WPA2
 *      
 *
 *  param: req the http post request
 *  return: true if we do otherwise false
 */
var hasParameters = function( req )
{
   if(! req || ! req.body)
   {
	return false;
   }
  if(! req.body.name || req.body.name === 'undefined')
  {
       return false;	
  }
  if(! req.body.ssid || req.body.ssid === 'undefined')
  {
      return false;
  }

  if(! req.body.type || req.body.type === 'undefined')
  {
     return false;
  }

  receivedConfig.deviceName  = req.body.name.trim();
  if(receivedConfig.deviceName.length === 0) { return false; } 
  

  receivedConfig.ssid = req.body.ssid.trim();
  if(receivedConfig.ssid.length === 0) { return false; }

  receivedConfig.networkType = req.body.type.trim();
  if(receivedConfig.networkType.length === 0) { return false; }

  //If wifi type isn't open then we need a password
  if(receivedConfig.networkType !== 'OPEN')
  {
     if(! req.body.password || req.body.password === 'undefined')
     {
	    return false;
     }
     
     receivedConfig.password = req.body.password.trim();
     
    if(receivedConfig.password.length === 0) { return false; }
  }
  

  return true;
};

/**
 *  Apply the wireless configuration and reboot
 *  the device.
 */
var saveWirelessConfig = function( wirelessConfig )
{

  var wirelessConfig = 'ctrl_interface=/var/run/wpa_supplicant\n';
  wirelessConfig += 'ctrl_interface_group=0\n';
  wirelessConfig += 'update_config=1\n';
  wirelessConfig += 'ap_scan=1\n';

  wirelessConfig += '\nnetwork={\n';

  wirelessConfig += ' ssid="' + receivedConfig.ssid + '"\n';

  if(receivedConfig.networkType === 'OPEN')  
  {
    wirelessConfig +=' scan_ssid=1\n';
    wirelessConfig +=' key_mgmt=NONE\n';
  } 
  else if(receivedConfig.networkType === 'WPA2/PSK')
  {

      wirelessConfig +='key_mgmt=WPA-PSK\n';
      wirelessConfig +='pairwise=CCMP TKIP\n';
      wirelessConfig +='group=CCMP TKIP WEP104 WEP40\n';
      wirelessConfig +='eap=TTLS PEAP TLS\n';
      wirelessConfig +='psk="'+ receivedConfig.password + '"\n'; 
  }  

  wirelessConfig +='}';
  console.log("Wireless Config: " );
  console.log( wirelessConfig );
  fs.writeFile('/etc/wpa_supplicant/wpa_supplicant.conf', wirelessConfig,
                 function( err )
  {
       if(err)
       {
         console.log( "error saving wifi config");
       }
       else
       {
         console.log("wifi config saved please reboot");
       }
  });
     
};

//Express routes
var app = express();

app.use(bodyParser.urlencoded({ extended: true }));

app.post('/api/configure', function( req, res )
{
        console.log( req.body );

        if(! hasParameters(req))
        {
            res.status(400).send();
            return;
        }

        saveWirelessConfig(receivedConfig);

        fs.writeFile('/etc/hostname', (receivedConfig.deviceName + '\n'), function( error )
        {
              if( error )
              {
                 res.status(500).send();
              }
              else
              {
                 res.status(200).send();
              }
        });
});

app.get('/api/reboot', function( req, res )
{
    exec('reboot', function(error, stdout, stderr)
    {
       if(error)
       {
           res.status(500).send();
       }
       else
       {
           res.status(200).send();   
       }
    });
});


//Catch any requests for routes that don't exist
app.get('*', function(req, res, next)
{
  var err = new Error();
  err.status = 404;
  next(err);
});

app.post('*', function(req, res, next) 
{
  var err = new Error();
  err.status = 404;
  next(err);
});

app.delete('*', function(req, res, next)
{
  var err = new Error();
  err.status = 404;
  next(err);
});

///Error handler for APP
app.use(function(err, req, res, next)
{
  res.status(err.status).send();
});
app.listen(8080);
