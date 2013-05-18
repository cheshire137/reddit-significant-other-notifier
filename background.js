var reddit_so_notifier = {
  get_url: function() {
    return 'http://www.reddit.com/user/cheshire137/submitted.json?sort=new';
  },

  get_latest_posts: function(callback) {
    var url = this.get_url();
    console.log(url);
    $.getJSON(url, function(data) {
      console.log(data);
      var posts = data.data.children;
      console.log(posts);
      console.log(posts[0]);
      callback(posts);
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
      console.log(notification);
      notification.show();
    }
  },

  check_for_posts: function() {
    var me = this;
    this.get_latest_posts(function(posts) {
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
  }
};

reddit_so_notifier.check_for_posts();
setInterval(function() {
  console.log('checking for posts');
  reddit_so_notifier.check_for_posts();
}, 60 * 5 * 1000);
