var reddit_so_notifier = {
  content_checker_interval: null,
  ms_between_checks: 60 * 5 * 1000,
  notifications_to_store: 5,

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

  add_new_notifications: function(maybe_new_nots, callback) {
    var me = this;
    chrome.storage.sync.get('reddit_so_notifier_notifications', function(nots) {
      nots = nots.reddit_so_notifier_notifications || [];
      var new_nots = [];
      for (var i=0; i<maybe_new_nots.length; i++) {
        var new_not = maybe_new_nots[i];
        if (!me.have_stored_notification(new_not.tag, nots)) {
          nots.push(new_not);
          new_nots.push(new_not);
        }
      }
      console.log(new_nots);
      nots = nots.slice(0, me.notifications_to_store);
      chrome.storage.sync.set(
        {'reddit_so_notifier_notifications': nots},
        function() {
          callback(new_nots);
        }
      );
    });
  },

  add_new_content: function(content, get_title, get_body, get_url, callback) {
    var notifications = [];
    for (var i=0; i<content.length; i++) {
      var item = content[i];
      var notification = {
        title: get_title(item),
        tag: item.data.name,
        body: get_body(item),
        url: get_url(item)
      };
      notifications.push(notification);
    }
    this.add_new_notifications(notifications, callback);
  },

  have_stored_notification: function(tag, notifications) {
    for (var i=0; i<notifications.length; i++) {
      if (notifications[i].tag === tag) {
        return true;
      }
    }
    return false;
  },

  display_notification: function(notification) {
    var notification = new Notification(notification.title,
                                        {body: notification.body,
                                         tag: notification.tag});
    notification.onclick = function() {
      window.open(notification.url);
      notification.close();
    };
    notification.show();
  },

  notify_about_content: function(new_notifications) {
    var me = this;
    for (var i=0; i<new_notifications.length; i++) {
      me.display_notification(new_notifications[i]);
    }
  },

  check_for_content: function(c_type, get_title, get_body, get_url, callback) {
    var me = this;
    this.get_latest_content(c_type, function(results) {
      if (results.error) {
        return;
      }
      me.add_new_content(
        results.data, get_title, get_body, get_url,
        function(new_notifications) {
          callback(new_notifications);
        }
      );
    });
  },

  check_for_posts: function(callback) {
    var me = this;
    this.check_for_content(
      'submitted',
      function(post) { return 'New Reddit Post by ' + post.data.author; },
      function(post) { return post.data.title; },
      function(post) { return post.data.url; },
      callback
    );
  },

  check_for_comments: function(callback) {
    var me = this;
    this.check_for_content(
      'comments',
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
      },
      callback
    );
  },

  check_for_posts_and_comments: function() {
    var time = new Date().getTime();
    console.log('checking for posts and comments at ' + time);
    var me = this;
    this.check_for_posts(function(new_notifications1) {
      me.check_for_comments(function(new_notifications) {
        me.notify_about_content(new_notifications);
      });
    });
  },

  setup_post_checker: function() {
    var me = this;
    this.check_for_posts(function(new_notifications) {
      me.notify_about_content(new_notifications);
    });
    content_checker_interval = setInterval(function() {
      me.check_for_posts();
    }, this.ms_between_checks);
  },

  setup_comment_checker: function() {
    var me = this;
    this.check_for_comments(function(new_notifications) {
      me.notify_about_content(new_notifications);
    });
    content_checker_interval = setInterval(function() {
      me.check_for_comments();
    }, this.ms_between_checks);
  },

  setup_post_and_comment_checker: function() {
    this.check_for_posts_and_comments();
    var me = this;
    content_checker_interval = setInterval(function() {
      me.check_for_posts_and_comments();
    }, this.ms_between_checks);
  },

  setup_content_checkers: function() {
    var me = this;
    chrome.storage.sync.get('reddit_so_notifier_options', function(opts) {
      opts = opts.reddit_so_notifier_options || {};
      if (opts.notifications === 'comments_only') {
        me.setup_comment_checker();
      } else if (opts.notifications === 'posts_only') {
        me.setup_post_checker();
      } else {
        me.setup_post_and_comment_checker();
      }
    });
  }
};

reddit_so_notifier.setup_content_checkers();
