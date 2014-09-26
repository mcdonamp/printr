var net = require('net'), Firebase = require('Firebase');

var JETDIRECT_PORT = 9100;
var STYLE_CENTER = 0;
var STYLE_ELIPSES = 1;

function main(){
	var ref = new Firebase('https://printrapp.firebaseio.com');
	var printerRef = ref.child('Printers');
	var messageRef = ref.child('Messages');
	var printers = {};

	// Handle addition, updates, and removal of printers
	printerRef.on('child_added', function(snapshot){
		printers[snapshot.name()] = snapshot.val();
	});

	printerRef.on('child_changed', function(snapshot){
		printers[snapshot.name()] = snapshot.val();
	});

	printerRef.on('child_removed', function(snapshot){
		delete printers[snapshot.name()];
	});

	// Any time a new printer is added, we've got to monitor it's messages
	messageRef.on('child_added', function(snapshot){
		var name = snapshot.name();
		var hostIP = printers[name]['IP'];
		var printerMessageRef = messageRef.child(name);

		// Get most recent message for each printer
		printerMessageRef.limit(1).on('child_added', function(snapshot){
			// Pull out data about the message, and connect it up with a printer
			var data = snapshot.val();
			var username = data['username'];
			var message = data['message'];
			var formattedMessage = formatMessage(username, message);
			console.log(formattedMessage + " !!!!!!");
			// Connect to the printer and update the text
			var printer = net.connect({port:JETDIRECT_PORT, host:hostIP}, function(){
				printer.write("@PJL RDYMSG DISPLAY = " +  formattedMessage + "\n");
				printer.end();
			});

			// Deal with callbacks
			printer.on('data', function(data){
				console.log(data.toString());
			});

			printer.on('error', function(error){
				console.log(error);
				printer.end();
			});

			printer.on('end', function(){
				console.log('ending socket');
			});
		});
	});
}

function formatMessage(username, message){
	username = username + ":";
	username = fixLength(username, 20, STYLE_CENTER);
	message = fixLength(message, 60, STYLE_ELIPSES);
	return username + message;
}

function fixLength(string, len, style){
	// Clamp length if it's over
	if (string.length > len) {
		string = string.substring(0, len - 1);
	}

	// Deal with styles
	switch (style) {
		case STYLE_CENTER:
			var numSpaces = (len - string.length)/2;
			var padding = "";
			while (padding.length < numSpaces) {
				padding += " ";
			}
			string = padding + string;
			break;

		case STYLE_ELIPSES:
			if (string.length > len - 3) {
				string = string.substring(0, len - 4) + "...";
			} else {
				string = string + "...";
			}
			break;
	}

	// Pad to total length, if necessary
	while (string.length < len) {
		string += " ";
	}

	return string;
}

main();