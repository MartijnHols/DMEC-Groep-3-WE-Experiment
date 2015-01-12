var config = require('./config');

var express = require('express'),
	app = express(),
	request = require('request');

var token = null;

// Initial page redirecting to Github
app.get('/auth', function (req, res) {
	res.redirect('https://www.yammer.com/dialog/oauth?client_id=' + config.CLIENT_ID + '&redirect_uri=' + config.REDIRECT_URI);
});

// Callback service parsing the authorization token and asking for the access token
app.get('/callback', function (req, res) {
	var code = req.query.code;
	console.log('/callback');

	var url = 'https://www.yammer.com/oauth2/access_token.json?client_id=' + config.CLIENT_ID + '&client_secret=' + config.CLIENT_SECRET + '&code=' + code;
	request({
		url: url,
		json: true
	}, function (error, response, json) {
		if (error) {
			throw error;
		}
		switch (response.statusCode) {
			case 200:
				console.log('Welkom ' + json.user.full_name + '@' + json.user.network_name + ' (' + json.user.job_title + ')!');
				token = json.access_token.token;
				getMessages();
				break;
			case 400:
				console.log(response.body);
				res.redirect('/');
				break;
			default:
				throw new Error('Received status code: ' + response.statusCode + ' (' + response.body + ')');
				break;
		}
	});
});

function getMessages() {
	request({
		url: 'https://www.yammer.com/api/v1/messages/private.json',
		headers: {
			'Authorization': 'Bearer ' + token
		},
		json: true
	}, function (error, response, json) {
		if (error) {
			throw error;
		} else if (response.statusCode !== 200) {
			throw new Error(response.body);
		}
		var numReferences = json.references.length;
		for (var i = 0; i < numReferences; i++) {
			var ref = json.references[i];
			if (ref.type === 'conversation') {
				console.log('Gesprek met ' + ref.participating_names[0].full_name);
				if (ref.participating_names[0].full_name === 'Milou Timmerman') {
					postMessage(ref);
					break;
				}
			}
		}
		var lastMessage = json.messages[0];
		console.log('Laatste bericht was: "' + lastMessage.body.plain + '", van ');
	});
}
function postMessage(ref) {
	request.post({
		url: 'https://www.yammer.com/api/v1/messages.json',
		headers: {
			'Authorization': 'Bearer ' + token
		},
		form: {
			body: 'Testing the Yammer API functionality!',
			replied_to_id: ref.id,
			broadcast: false
		},
		json: true
	}, function (error, response, json) {
		if (error) {
			throw error;
		} else if (response.statusCode > 400) {
			throw new Error(response.body);
		}
		console.log('Bericht verstuurd naar ' + ref.participating_names[0].full_name);
	});
}

app.get('/', function (req, res) {
	res.send('Hello<br><a href="/auth">Sign in with Yammer</a>');
});

app.listen(3000);

console.log('Express server started on port 3000');
