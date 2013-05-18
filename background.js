/*
 * Copyright 2013 Sarah Vessels
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

var reddit_so_notifier = {
  content_checker_interval: null,
  notifications_to_store: 5,
  is_checking: false,

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
    if (a.timestamp < b.timestamp) {
      return 1;
    }
    return a.timestamp > b.timestamp ? -1 : 0;
  },

  store_notification: function(notification, callback) {
    var me = this;
    chrome.storage.sync.get('reddit_so_notifier_notifications', function(nots) {
      nots = nots.reddit_so_notifier_notifications || [];
      var was_new = false;
      if (!me.have_stored_notification(notification.tag, nots)) {
        nots.push(notification);
        was_new = true;
      }
      nots = nots.sort(me.notification_compare);
      if (nots.length > me.notifications_to_store) {
        nots = nots.slice(0, me.notifications_to_store);
      }
      chrome.storage.sync.set(
        {'reddit_so_notifier_notifications': nots},
        function() {
          callback(was_new);
        }
      );
    });
  },

  display_notification: function(data) {
    var notification = new Notification(data.title, {body: data.body,
                                                     tag: data.tag});
    notification.onclick = function() {
      window.open(data.url);
      notification.close();
    };
    notification.show();
  },

  get_reddit_timestamp: function(item) {
    return new Date(parseInt(item.data.created_utc + '000', 10)).getTime();
  },

  get_subreddit_url: function(subreddit) {
    return 'http://www.reddit.com/r/' + subreddit;
  },

  notify_about_content_item: function(content, i, get_title, get_body, get_url) {
    var item = content[i];
    var tag = item.data.name;
    var subreddit = item.data.subreddit;
    var subreddit_url = this.get_subreddit_url(subreddit);
    var title = get_title(item);
    var body = get_body(item);
    var url = get_url(item);
    var timestamp = this.get_reddit_timestamp(item);
    var notification = {tag: tag, title: title, body: body, url: url,
                        timestamp: timestamp, subreddit: subreddit,
                        subreddit_url: subreddit_url};
    var me = this;
    this.store_notification(notification, function(was_new) {
      if (was_new) {
        me.display_notification(notification);
      }
      if (i == 0) {
        me.is_checking = false;
      } else {
        me.notify_about_content_item(content, i-1, get_title, get_body,
                                     get_url);
      }
    });
  },

  notify_about_content: function(content, get_title, get_body, get_url) {
    if (content.length < 1) {
      this.is_checking = false;
      return;
    }
    this.notify_about_content_item(content, content.length - 1, get_title,
                                   get_body, get_url);
  },

  get_post_title: function(post) {
    return 'New Reddit Post by ' + post.data.author;
  },

  get_post_body: function(post) { return post.data.title; },

  get_post_url: function(post) { return post.data.url; },

  notify_about_posts: function(posts) {
    var me = this;
    this.notify_about_content(
      posts,
      me.get_post_title,
      me.get_post_body,
      me.get_post_url
    );
  },

  get_link_title_for_url: function(link_title) {
    var punc_regex = /[\.,-\/#!$%\^&\*;:{}=\-`~()]/g;
    return link_title.toLowerCase().replace(punc_regex, '').substring(0, 50).
                      split(' ').slice(0, -1).join('_');
  },

  get_comment_title: function(comment) {
    return 'New Reddit Comment by ' + comment.data.author;
  },

  get_comment_body: function(comment) {
    var limit = 100;
    var body = $.trim(comment.data.body);
    if (body.length <= limit) {
      return body;
    }
    return body.substring(0, limit).split(' ').slice(0, -1).join(' ') +
           '...';
  },

  get_comment_url: function(comment) {
    var id = comment.data.link_id.split('_')[1];
    var link_title = this.get_link_title_for_url(comment.data.link_title);
    var name = comment.data.name.split('_')[1];
    return 'http://www.reddit.com/r/' + comment.data.subreddit +
           '/comments/' + id + '/' + link_title + '/' + name;
  },

  notify_about_comments: function(comments) {
    var me = this;
    this.notify_about_content(
      comments,
      me.get_comment_title,
      me.get_comment_body,
      me.get_comment_url
    );
  },

  get_content_type: function(item) {
    var prefix = item.kind;
    if (prefix === 't1') {
      return 'comment';
    }
    if (prefix === 't3') {
      return 'post';
    }
    return 'unknown';
  },

  notify_about_posts_and_comments: function(posts_and_comments) {
    var me = this;
    this.notify_about_content(
      posts_and_comments,
      function(item) {
        if (me.get_content_type(item) === 'comment') {
          return me.get_comment_title(item);
        }
        return me.get_post_title(item);
      },
      function(item) {
        if (me.get_content_type(item) === 'comment') {
          return me.get_comment_body(item);
        }
        return me.get_post_body(item);
      },
      function(item) {
        if (me.get_content_type(item) === 'comment') {
          return me.get_comment_url(item);
        }
        return me.get_post_url(item);
      }
    );
  },

  check_for_content: function(content_type, callback) {
    var me = this;
    this.get_latest_content(content_type, function(results) {
      if (results.error) {
        console.error(results.error);
        callback([]);
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
    if (this.is_checking) {
      return;
    }
    this.is_checking = true;
    var me = this;
    this.check_for_content('submitted', function(new_posts) {
      me.update_last_check_timestamp(function() {
        me.notify_about_posts(new_posts);
      });
    });
  },

  check_for_comments: function() {
    if (this.is_checking) {
      return;
    }
    this.is_checking = true;
    var me = this;
    this.check_for_content('comments', function(new_comments) {
      me.update_last_check_timestamp(function() {
        me.notify_about_comments(new_comments);
      });
    });
  },

  check_for_posts_and_comments: function() {
    if (this.is_checking) {
      return;
    }
    this.is_checking = true;
    var me = this;
    this.check_for_content('submitted', function(new_posts) {
      me.check_for_content('comments', function(new_comments) {
        me.update_last_check_timestamp(function() {
          me.notify_about_posts_and_comments(new_posts.concat(new_comments));
        });
      });
    });
  },

  setup_post_checker: function(frequency) {
    clearInterval(this.content_checker_interval);
    this.check_for_posts();
    var me = this;
    this.content_checker_interval = setInterval(function() {
      me.check_for_posts();
    }, frequency);
  },

  setup_comment_checker: function(frequency) {
    clearInterval(this.content_checker_interval);
    this.check_for_comments();
    var me = this;
    this.content_checker_interval = setInterval(function() {
      me.check_for_comments();
    }, frequency);
  },

  setup_post_and_comment_checker: function(frequency) {
    clearInterval(this.content_checker_interval);
    this.check_for_posts_and_comments();
    var me = this;
    this.content_checker_interval = setInterval(function() {
      me.check_for_posts_and_comments();
    }, frequency);
  },

  get_frequency_ms: function(opts) {
    var frequency = opts.frequency || 1;
    return frequency * 60 * 1000;
  },

  setup_content_checkers: function() {
    var me = this;
    chrome.storage.sync.get('reddit_so_notifier_options', function(opts) {
      opts = opts.reddit_so_notifier_options || {};
      var frequency = me.get_frequency_ms(opts);
      if (opts.notifications === 'comments_only') {
        me.setup_comment_checker(frequency);
      } else if (opts.notifications === 'posts_only') {
        me.setup_post_checker(frequency);
      } else {
        me.setup_post_and_comment_checker(frequency);
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
