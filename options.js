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

function save_options() {
  var user_name = $.trim($('#user_name').val());
  $('#user_name').val(user_name);
  var options = {user_name: user_name};
  var status_area = $('#status-message');
  chrome.storage.sync.set({'reddit_so_notifier_options': options}, function() {
    status_area.text('Okay, got it!').fadeIn(function() {
      setTimeout(function() {
        status_area.fadeOut();
      }, 2000);
    });
  });
}

function restore_options() {
  chrome.storage.sync.get('reddit_so_notifier_options', function(opts) {
    opts = opts.reddit_so_notifier_options || {};
    if (opts.user_name) {
      $('#user_name').val(opts.user_name);
    } else {
      $('#user_name').val('');
    }
  });
}

document.addEventListener('DOMContentLoaded', restore_options);
$('a[href="#save-options"]').click(save_options);
