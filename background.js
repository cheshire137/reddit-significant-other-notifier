var reddit_so_notifier = {
  post_checker_interval: null,
  ms_between_checks: 60 * 5 * 1000,

  get_url: function(callback) {
    chrome.storage.sync.get('reddit_so_notifier_options', function(opts) {
      opts = opts.reddit_so_notifier_options || {};
      if (opts.user_name) {
        callback('http://www.reddit.com/user/' + opts.user_name +
                 '/submitted.json?sort=new');
      } else {
        callback('');
      }
    });
  },

  get_latest_posts: function(callback) {
    this.get_url(function(url) {
      if (url.length < 1) {
        callback({posts: [], error: 'No user name set in options'});
        return;
      }
      console.log(url);
      $.getJSON(url, function(data) {
        console.log(data);
        var posts = data.data.children;
        console.log(posts);
        console.log(posts[0]);
        callback({posts: posts, error: false});
      });
    });
  },

  get_last_check_timestamp: function(callback) {
    chrome.storage.local.get('reddit_so_notifier', function(data) {
      data = data.reddit_so_notifier || {};
      if (data.hasOwnProperty('last_check_timestamp')) {
        callback(data.last_check_timestamp);
      } else {
        callback(null);
      }
    });
  },

  filter_posts_since_last_check: function(posts, timestamp) {
    var posts_since_timestamp = [];
    for (var i=0; i<posts.length; i++) {
      var post = posts[i];
      if (post.data.created_utc > timestamp) {
        posts_since_timestamp.push(post);
      }
    }
    return posts_since_timestamp;
  },

  update_last_check_timestamp: function(callback) {
    var data = {last_check_timestamp: new Date().getTime()};
    chrome.storage.local.set({'reddit_so_notifier': data}, function() {
      callback();
    });
  },

  notify_about_posts: function(posts) {
    for (var i=0; i<posts.length; i++) {
      var post = posts[i];
      console.log('notifying about post:');
      console.log(post);
      var notification = webkitNotifications.createNotification(
        'icon48.png', 'New Reddit Post', post.data.title
      );
      notification.onclick = function() {
        window.open(post.data.url);
        notification.close();
      };
      notification.show();
    }
  },

  check_for_posts: function() {
    var me = this;
    console.log('checking for posts');
    this.get_latest_posts(function(results) {
      if (results.error) {
        return;
      }
      var posts = results.posts;
      console.log('got latest posts');
      me.get_last_check_timestamp(function(timestamp) {
        console.log('last check timestamp:');
        console.log(timestamp);
        var new_posts = [];
        if (timestamp) {
          new_posts = me.filter_posts_since_last_check(posts, timestamp);
        } else if (posts.length > 0) {
          new_posts = [posts[0]];
        }
        me.update_last_check_timestamp(function() {
          console.log('new posts:');
          console.log(new_posts);
          me.notify_about_posts(new_posts);
        });
      });
    });
  },

  setup_post_checker: function() {
    this.check_for_posts();
    var me = this;
    post_checker_interval = setInterval(function() {
      me.check_for_posts();
    }, this.ms_between_checks);
  }
};

reddit_so_notifier.setup_post_checker();
