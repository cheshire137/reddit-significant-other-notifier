var reddit_so_notifier = {
  post_checker_interval: null,
  comment_checker_interval: null,
  ms_between_checks: 60 * 5 * 1000,

  get_url: function(content_type, callback) {
    chrome.storage.sync.get('reddit_so_notifier_options', function(opts) {
      opts = opts.reddit_so_notifier_options || {};
      if (opts.user_name) {
        callback('http://www.reddit.com/user/' + opts.user_name +
                 '/' + content_type + '.json?sort=new');
      } else {
        callback('');
      }
    });
  },

  get_latest_content: function(content_type, callback) {
    this.get_url(content_type, function(url) {
      if (url.length < 1) {
        callback({data: [], error: 'No user name set in options'});
        return;
      }
      $.getJSON(url, function(data) {
        callback({data: data.data.children, error: false});
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

  filter_content_since_last_check: function(content, timestamp) {
    var content_since_timestamp = [];
    for (var i=0; i<content.length; i++) {
      var item = content[i];
      if (item.data.created_utc > timestamp) {
        content_since_timestamp.push(item);
      }
    }
    return content_since_timestamp;
  },

  update_last_check_timestamp: function(callback) {
    var data = {last_check_timestamp: new Date().getTime()};
    chrome.storage.local.set({'reddit_so_notifier': data}, function() {
      callback();
    });
  },

  notify_about_content_item: function(item, get_title, get_body, get_url) {
    var notification = new Notification(
      get_title(item), {body: get_body(item), tag: item.data.name}
    );
    notification.onclick = function() {
      window.open(get_url(item));
      notification.close();
    };
    notification.show();
  },

  notify_about_content: function(content, get_title, get_body, get_url) {
    for (var i=0; i<content.length; i++) {
      this.notify_about_content_item(content[i], get_title, get_body, get_url);
    }
  },

  notify_about_posts: function(posts) {
    this.notify_about_content(
      posts,
      function(post) { return 'New Reddit Post by ' + post.data.author; },
      function(post) { return post.data.title; },
      function(post) { return post.data.url; }
    );
  },

  notify_about_comments: function(comments) {
    this.notify_about_content(
      comments,
      function(comment) {
        return 'New Reddit Comment by ' + comment.data.author;
      },
      function(comment) {
        var limit = 100;
        var body = $.trim(comment.data.body);
        if (body.length <= limit) {
          return body;
        }
        return body.substring(0, limit).split(' ').slice(0, -1).join(' ') +
               '...';
      },
      function(comment) {
        var id = comment.data.link_id.split('_')[1];
        return 'http://www.reddit.com/r/' + comment.data.subreddit +
               '/comments/' + id;
      }
    );
  },

  check_for_content: function(content_type, callback) {
    var me = this;
    this.get_latest_content(content_type, function(results) {
      if (results.error) {
        return;
      }
      var content = results.data;
      me.get_last_check_timestamp(function(timestamp) {
        var new_content = [];
        if (timestamp) {
          new_content = me.filter_content_since_last_check(content, timestamp);
        } else if (content.length > 0) {
          new_content = [content[0]];
        }
        me.update_last_check_timestamp(function() {
          callback(new_content);
        });
      });
    });
  },

  check_for_posts: function() {
    var me = this;
    this.check_for_content('submitted', function(new_posts) {
      me.notify_about_posts(new_posts);
    });
  },

  check_for_comments: function() {
    var me = this;
    this.check_for_content('comments', function(new_comments) {
      me.notify_about_comments(new_comments);
    });
  },

  setup_post_checker: function() {
    this.check_for_posts();
    var me = this;
    post_checker_interval = setInterval(function() {
      me.check_for_posts();
    }, this.ms_between_checks);
  },

  setup_comment_checker: function() {
    this.check_for_comments();
    var me = this;
    comment_checker_interval = setInterval(function() {
      me.check_for_comments();
    }, this.ms_between_checks);
  },

  setup_content_checkers: function() {
    var me = this;
    chrome.storage.sync.get('reddit_so_notifier_options', function(opts) {
      opts = opts.reddit_so_notifier_options || {};
      if (opts.notifications !== 'comments_only') {
        me.setup_post_checker();
      }
      if (opts.notifications !== 'posts_only') {
        me.setup_comment_checker();
      }
    });
  }
};

reddit_so_notifier.setup_content_checkers();
