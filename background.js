var reddit_so_notifier = {
  content_checker_interval: null,
  ms_between_checks: 60 * 1 * 1000,
  notifications_to_store: 10,

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
      var reddit_ts = this.get_reddit_timestamp(item);
      if (reddit_ts > timestamp) {
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

  have_stored_notification: function(tag, notifications) {
    for (var i=0; i<notifications.length; i++) {
      if (notifications[i].tag === tag) {
        return true;
      }
    }
    return false;
  },

  notification_compare: function(a, b) {
    if (a.date < b.date) {
      return 1;
    }
    return a.date > b.date ? -1 : 0;
  },

  store_notification: function(notification, callback) {
    var me = this;
    chrome.storage.sync.get('reddit_so_notifier_notifications', function(nots) {
      nots = nots.reddit_so_notifier_notifications || [];
      nots = nots.slice(0, me.notifications_to_store - 1);
      if (!me.have_stored_notification(notification.tag, nots)) {
        nots.push(notification);
      }
      nots.sort(me.notification_compare);
      chrome.storage.sync.set(
        {'reddit_so_notifier_notifications': nots},
        function() {
          callback();
        }
      );
    });
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

  get_reddit_timestamp: function(item) {
    return new Date(parseInt(item.data.created_utc + '000', 10)).getTime();
  },

  notify_about_content_item: function(item, get_title, get_body, get_url) {
    var tag = item.data.name;
    var title = get_title(item);
    var body = get_body(item);
    var url = get_url(item);
    var timestamp = this.get_reddit_timestamp(item);
    var notification = {tag: tag, title: title, body: body, url: url,
                        timestamp: timestamp};
    var me = this;
    this.store_notification(notification, function() {
      me.display_notification(notification);
    });
  },

  notify_about_content: function(content, get_title, get_body, get_url) {
    for (var i=content.length-1; i>=0; i--) {
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

  get_link_title_for_url: function(link_title) {
    var punc_regex = /[\.,-\/#!$%\^&\*;:{}=\-`~()]/g;
    return link_title.toLowerCase().replace(punc_regex, '').substring(0, 50).
                      split(' ').slice(0, -1).join('_');
  },

  notify_about_comments: function(comments) {
    var me = this;
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
        var link_title = me.get_link_title_for_url(comment.data.link_title);
        var name = comment.data.name.split('_')[1];
        console.log('comment URL: ' + 'http://www.reddit.com/r/' + comment.data.subreddit + '/comments/' + id + '/' + link_title + '/' + name);
        return 'http://www.reddit.com/r/' + comment.data.subreddit +
               '/comments/' + id + '/' + link_title + '/' + name;
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
        callback(new_content);
      });
    });
  },

  check_for_posts: function() {
    var me = this;
    this.check_for_content('submitted', function(new_posts) {
      me.update_last_check_timestamp(function() {
        me.notify_about_posts(new_posts);
      });
    });
  },

  check_for_comments: function() {
    var me = this;
    this.check_for_content('comments', function(new_comments) {
      me.update_last_check_timestamp(function() {
        me.notify_about_comments(new_comments);
      });
    });
  },

  check_for_posts_and_comments: function() {
    var me = this;
    this.check_for_content('submitted', function(new_posts) {
      me.notify_about_posts(new_posts);
      me.check_for_content('comments', function(new_comments) {
        me.update_last_check_timestamp(function() {
          me.notify_about_comments(new_comments);
        });
      });
    });
  },

  setup_post_checker: function() {
    this.check_for_posts();
    var me = this;
    this.content_checker_interval = setInterval(function() {
      me.check_for_posts();
    }, this.ms_between_checks);
  },

  setup_comment_checker: function() {
    this.check_for_comments();
    var me = this;
    this.content_checker_interval = setInterval(function() {
      me.check_for_comments();
    }, this.ms_between_checks);
  },

  setup_post_and_comment_checker: function() {
    console.log('checking for posts and comments at ' + (new Date()));
    this.check_for_posts_and_comments();
    var me = this;
    this.content_checker_interval = setInterval(function() {
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

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
  if (request.action == 'check_for_content') {
    reddit_so_notifier.setup_content_checkers();
  }
});
