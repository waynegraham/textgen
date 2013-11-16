var fs = require('fs'),
sys = require('sys'),
redis = require("redis"),
url = require('url'),
redisURL = url.parse(process.env.REDISCLOUD_URL),
client = redis.createClient(redisURL.port, redisURL.hostname, { no_ready_check: true });

client.auth(redisURL.auth.split(':')[1]);


var init = function() {
  var texts = fs.readdirSync(__dirname + '/texts');

  for(var i = 0; i < texts.length; i++) {
    var filename = __dirname + '/texts/' + texts[i];

    fs.readFile(filename, 'ascii', function(err, data) {
      var words = data.split(/\s+/);

      for(var j = 0; j < words.length - 1; j++) {
        client.hincrby(words[j], words[j + 1], 1, function(err, res){
          console.log(err);
          console.log(res);
        });

      }
    });
  }
  client.quit();
};

var randomWord = function(callback) {
  client.RANDOMKEY(function(result, key) {
    callback(key);
  });
};

var nextWord = function(word, callback) {
    client.exists(word, function(err, data) {
        if (data === null) { callback(null); }
        else {
            client.hgetall(word, function(result, data) {
                var sum = 0;
                for (var i in data) {
                    sum += data[i];
                }
                var rand = Math.floor(Math.random()*sum+1);
                var partial_sum = 0;
                var next = null;
                for (i in data) {
                    partial_sum += data[i];
                    if (partial_sum >= rand) { next = i; }
                }
                callback(next);
            });
        }
    });
};

var randomSentance = function(callback) {
  var sentance = '';

  randomWord(function(word) {
    sentance += word;

    function build(next) {
      sentance += ' ' + next;

      if (/(\.|!|\?)/.exec(sentance)) {
        sys.puts(sentance);
        client.quit();
      } else {
        nextWord(next, build);
        console.log(sentance);
      }
    }


    build(word);
  });
};

if (process.argv[2] == 'init') {
    init();
} else {
    randomSentance();
}


