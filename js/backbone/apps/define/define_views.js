// http://civicrm.org/licensing
(function (ts){
  CRM.volunteerApp.module('Define', function(Define, volunteerApp, Backbone, Marionette, $, _) {

    var visibility = CRM.pseudoConstant.volunteer_need_visibility;

    Define.layout = Marionette.Layout.extend({
      template: "#crm-vol-define-layout-tpl",
      regions: {
        scheduledNeeds: "#crm-vol-define-scheduled-needs-region"
      }
    });

    // allows us to toggle different views for the same model
    var itemViewSettings = {
      attributes: function() {
        return {
          class: 'crm-vol-define-need ' + (this.model.collection.indexOf(this.model) % 2 ? 'even' : 'odd')
        };
      },

      templateHelpers: {
        pseudoConstant: CRM.pseudoConstant,
        RenderUtil: CRM.volunteerApp.RenderUtil,
        visibilityValue: visibility.public
      },

      events: {
        'change :input:not(.timeplugin, [name=schedule_type])': 'updateNeed',
        'change select[name=schedule_type]': 'changeScheduleType',
        'blur :input.timeplugin': 'updateNeed',
        'click .crm-vol-edit-notes': 'editNotes',
        'click .crm-vol-del': 'deleteNeed'
      },

      onRender: function() {
        this.$('.crm-select2').crmSelect2();

        this.$("[name='display_start_date'], [name='display_end_date']").addClass('dateplugin').datepicker();

        this.$("[name='display_start_time'], [name='display_end_time']").addClass('timeplugin').timeEntry({
          show24Hours: CRM.config.timeInputFormat == 2
        });

        // populate and format time
        if (this.model.get('display_start_time')) {
          this.$("[name='display_start_time']").timeEntry('setTime', this.model.get('display_start_time'));
        }
        if (this.model.get('display_end_time')) {
          this.$("[name='display_end_time']").timeEntry('setTime', this.model.get('display_end_time'));
        }

        if (this.model.get('visibility_id') == visibility.public) {
          this.$("[name='visibility_id']").prop("checked", true);
        }

        if (this.model.get('is_active') == '1') {
          this.$("[name='is_active']").prop("checked", true);
        }

        this.listenTo(this.model, 'change:notes', this.updateNotesButton);
        this.updateNotesButton();
        this.initializeTimeComponents();
      },

      updateNotesButton: function() {
        var notes = $.trim(this.model.get('notes') || '');
        var hasNotes = notes !== '';
        this.$('.crm-vol-edit-notes').toggleClass('crm-vol-has-notes', hasNotes);
        this.$('.crm-vol-notes-label').text(hasNotes ? ts('Edit notes') : ts('Add notes'));
      },

      saveNeedField: function(field_name, value) {
        var thisNeed = this;
        if (thisNeed.model.get(field_name) == value) {
          return $.Deferred().resolve().promise();
        }
        thisNeed.model.set(field_name, value);
        var params = {'id': thisNeed.model.get('id')};
        params[field_name] = value;
        return CRM.api3('VolunteerNeed', 'create', params, true).done(function() {
          Define.registerNeedChange('updated', params.id);
        });
      },

      editNotes: function(e) {
        e.preventDefault();
        var view = this;
        var current = view.model.get('notes') || '';
        var $form = $('<div class="crm-vol-define-notes-dialog"></div>');
        var $textarea = $('<textarea class="crm-form-textarea" rows="6" cols="50"></textarea>').val(current);
        $form.append($('<p class="description">').text(ts('Notes for volunteers signing up to this shift.')));
        $form.append($textarea);

        var dialog = CRM.confirm({
          title: ts('Opportunity notes'),
          message: $form,
          options: {
            no: ts('Cancel'),
            yes: ts('Save')
          },
          width: '480px'
        });

        dialog.on('crmConfirm:yes', function() {
          var value = $.trim($textarea.val());
          view.saveNeedField('notes', value);
        });

        setTimeout(function() {
          $textarea.trigger('focus');
        }, 0);
      },

      initializeTimeComponents: function () {
        var mode = '';
        var needViewItem = this;

        var durationValue = needViewItem.model.get('duration');
        if (needViewItem.model.get('userAdded') === true) {
          mode = '';
        } else if (durationValue === '' || durationValue < 1) {
          mode = 'open';
        } else if (!needViewItem.model.get('end_time')) {
          mode = 'shift';
        } else {
          mode = 'flexible';
        }

        needViewItem.$('select[name=schedule_type]').val(mode);
        this.toggleTimeComponents(mode, false);
      },

      changeScheduleType: function (e) {
        this.toggleTimeComponents(e.currentTarget.value);
      },

      /**
       * Shows/hides time fields according to schedule type (mode).
       *
       * @param {String} mode
       *   'shift,' 'flexible,' and 'open' are supported. If another string is
       *   passed, all time components will be hidden.
       * @param {Boolean} save
       *   Whether or not the field toggling should trigger updateNeeds. Default to true.
       */
      toggleTimeComponents: function (mode, save) {
        save = (typeof (save) === 'undefined') ? true : save;

        var needViewItem = this;
        var start = needViewItem.$('.time_components .start_datetime').hide();
        var end = needViewItem.$('.time_components .end_datetime').hide();
        var duration = needViewItem.$('.time_components .duration').hide();

        switch (mode) {
          case 'shift':
            start.show();
            end.find('.dateplugin').datepicker("setDate", null);
            var endTimeField = end.find('.timeplugin').timeEntry("setTime", null);
            duration.show();

            if (save) {
              endTimeField.trigger('blur');
            }
            break;
          case 'flexible':
            start.show();
            end.show();
            duration.show();
            break;
          case 'open':
            var durationField = duration.find(':input').val('');
            end.find('.dateplugin').datepicker("setDate", null);
            var endTimeField = end.find('.timeplugin').timeEntry("setTime", null);
            start.find('.dateplugin').datepicker("setDate", "+0");
            var startTimeField = start.find('.timeplugin').timeEntry("setTime", '00:00:00');

            if (save) {
              durationField.trigger('change');
              endTimeField.trigger('blur');
              startTimeField.trigger('blur');
            }
            break;
        }
      },

      updateNeed: function(e) {
        var field_name = e.currentTarget.name;
        var thisNeed = this;
        var value = e.currentTarget.value;

        function pad(number) {
          var r = String(number);
          return (r.length === 1) ? '0' + r : r;
        }

        /**
         * Helper function to put together the date/time from user input.
         *
         * @param {String} when
         *   Either 'start' or 'end.'
         * @returns {String}
         *   A string representation of the time.
         */
        function getUserInputDateTime(when) {
          var date = thisNeed.$("[name='display_" + when + "_date']").datepicker('getDate');
          var time = thisNeed.$("[name='display_" + when + "_time']").timeEntry('getTime');

          if (!date && !time) {
            value = '';
          } else if (!date) {
            // Don't save a datetime field unless the date is set. (Resetting
            // the dateTime value to that of the model short-circuits
            // updateNeed's API call.)
            value = thisNeed.model.get(when + '_time');
          } else {
            // format the time; if not set, use the last second of the day for
            // the end of a window, and the first second of the day for the
            // beginning of a window
            if (!time) {
              time = (when === 'end' ? '23:59:00' : '00:00:00');
            } else {
              time = time.toTimeString().split(' ')[0];
            }

            value = '' + date.getFullYear() + '-' + pad(1 + date.getMonth()) + '-' + pad(date.getDate()) + ' ' + time;
          }

          return value;
        }


        // preprocess special-case fields
        switch (field_name) {
          case 'display_start_date':
          case 'display_start_time':
          case 'display_end_date':
          case 'display_end_time':
            var when = field_name.substring(0, 11) === 'display_end' ? 'end' : 'start';
            field_name = when + '_time';
            value = getUserInputDateTime(when);
            break;
          case 'visibility_id':
            value = e.currentTarget.checked ? e.currentTarget.value : visibility.admin;
            break;
          case 'is_active':
            value = e.currentTarget.checked ? e.currentTarget.value : 0;
            break;
          case 'quantity':
            if (value === '' || value === null) {
              value = null;
            }
            else {
              value = parseInt(value, 10);
              if (isNaN(value) || value < 0) {
                value = null;
              }
            }
            break;
        }

        thisNeed.saveNeedField(field_name, value);
      },

      deleteNeed: function() {
        var id = this.model.get('id');
        var count = this.model.get('api.volunteer_assignment.getcount') || 0;
        var role = CRM.pseudoConstant.volunteer_role[this.model.get('role_id')];
        // FIXME: the JS implementation of CiviCRM's string translator doesn't yet support plurals
        // DESIRED CODE:
        // var msg = ts("There is currently %count volunteer assigned to this need. The volunteer's activity history will be preserved, but they will be disconnected from this shift.", {count: count,plural: "There are currently %count volunteers assigned to this need. The volunteers' activity histories will be preserved, but they will be disconnected from this shift."});
        // STOPGAP CODE:
        var msg = (count == 1
          ? ts("There is currently %1 volunteer assigned to this need. The volunteer's activity history will be preserved, but they will be disconnected from this shift.", {1: count})
          : (count == 0
              ? ts("There are currently %1 volunteers assigned to this need.", {1: count})
              : ts("There are currently %1 volunteers assigned to this need. The volunteers' activity histories will be preserved, but they will be disconnected from this shift.", {1: count})
            )
        );
        // END FIXME
        CRM.confirm(function() {
          Define.collectionView.collection.remove(id);
          CRM.api3('volunteer_need', 'delete', {id: id}, true).done(function() {
            //Store the deleted need ID so the "volunteer:close:define" event
            //Can send it to any listeners
            Define.registerNeedChange("deleted", id);
          });
        }, {
          title: ts('Delete %1', {1: role}),
          message: msg
        });
        return false;
      }
    };

    Define.registerNeedChange = function(action, id) {
      Define.needRegistry.clean = _.without(Define.needRegistry.clean, id);

      //Only remove from the "created" category if we are deleting it.
      if(action === "deleted") {
        Define.needRegistry.created = _.without(Define.needRegistry.created, id);
        Define.needRegistry.updated = _.without(Define.needRegistry.updated, id);
      }

      //Only push it to the list if we haven't already.
      if (Define.needRegistry[action].indexOf(id) === -1) {
        //If it is an Update, but this need is new, leave it in "created".
        if (action !== "update" || Define.needRegistry.created.indexOf(id) === -1) {
          Define.needRegistry[action].push(id);
        }
      }
    };

    Define.scheduledNeedItemView = Marionette.ItemView.extend(_.extend(itemViewSettings, {
      template: '#crm-vol-define-scheduled-need-tpl',
      tagName: 'tr'
    }));

    Define.flexibleNeedItemView = Marionette.ItemView.extend(_.extend({}, itemViewSettings, {
      template: '#crm-vol-define-flexible-need-tpl',
      tagName: 'tr',
      attributes: function() {
        return { class: 'crm-vol-define-flexible-need-row' };
      }
    }));

    Define.needsCompositeView = Marionette.CompositeView.extend({
      id: "manage_needs",
      template: "#crm-vol-define-table-tpl",
      itemView: Define.scheduledNeedItemView,
      itemViewContainer: '#crm-vol-define-needs-table > tbody',

      initialize: function(options) {
        this.flexibleModel = options.flexibleModel;
      },

      events: {
        'change #crm-vol-define-add-need': 'addNewNeed'
      },

      addNewNeed: function() {
        var params = {
          role_id: $('#crm-vol-define-add-need').val()
        };
        // Reset add another select
        $('#crm-vol-define-add-need').select2('val', '');
        $('#crm-vol-define-needs-table').block();
        this.collection.createNewNeed(params).done(function(data) {
          //Register the new ID
          Define.registerNeedChange("created", data.id);
          $('#crm-vol-define-needs-table').unblock();
        });
      },

      appendHtml: function(thisView, itemView) {
        var container = thisView.$(thisView.itemViewContainer);
        var addRow = thisView.$('#crm-vol-define-add-row');
        if (addRow.length) {
          addRow.before(itemView.el);
        }
        else {
          container.append(itemView.el);
        }
      },

      onRender: function() {
        if (!this.$('#crm-vol-define-add-row').length) {
          this.$('#crm-vol-define-needs-table > tbody').append($('#crm-vol-define-add-row-tpl').html());
          this.$('#crm-vol-define-add-need').crmSelect2();
        }
        if (this.flexibleModel) {
          if (this.flexibleItemView) {
            this.flexibleItemView.close();
            this.flexibleItemView = null;
          }
          this.flexibleItemView = new Define.flexibleNeedItemView({
            model: this.flexibleModel
          });
          this.flexibleItemView.render();
          this.$('#crm-vol-define-add-row').before(this.flexibleItemView.el);
        }
      },

      onClose: function() {
        if (this.flexibleItemView) {
          this.flexibleItemView.close();
          this.flexibleItemView = null;
        }
      }
    });

    /**
     * Shows a modal form for creating many shifts from a simple repeating
     * pattern. When the form is submitted, VolunteerNeed.createbulk runs on
     * the server and the just-created shifts are appended to the existing
     * needs list, where each one can be individually modified or deleted.
     */
    Define.showBulkCreateDialog = function(collection) {
      var $form = $('<div class="crm-vol-define-bulk-dialog"></div>')
        .html($('#crm-vol-define-bulk-form-tpl').html());

      // Default start date = today; default start time = 09:00.
      var today = new Date();
      $form.find('[name=start_date]').addClass('dateplugin').datepicker().datepicker('setDate', today);
      $form.find('[name=start_time]').addClass('timeplugin').timeEntry({
        show24Hours: CRM.config.timeInputFormat == 2
      }).timeEntry('setTime', '09:00:00');
      $form.find('select.crm-select2').crmSelect2();

      var renderPreview = function() {
        var parsed = parseBulkForm($form);
        var $preview = $form.find('.crm-vol-bulk-preview').empty();
        if (!parsed.ok) {
          $preview.append($('<div class="status messages">').text(parsed.error));
          return;
        }
        var unitLabels = {minute: ts('minutes'), hour: ts('hours'), day: ts('days'), week: ts('weeks')};
        var unitLabel = unitLabels[parsed.params.interval_unit] || parsed.params.interval_unit;
        var msg = parsed.params.count === 1
          ? ts('1 shift will be created (%1 minutes long, starting %2 at %3).', {
              1: parsed.params.duration,
              2: parsed.params.start_date,
              3: parsed.params.start_time
            })
          : ts('%1 shifts will be created (%2 minutes each, every %3 %4, starting %5 at %6).', {
              1: parsed.params.count,
              2: parsed.params.duration,
              3: parsed.params.interval,
              4: unitLabel,
              5: parsed.params.start_date,
              6: parsed.params.start_time
            });
        $preview.append($('<div class="status messages">').text(msg));
      };

      $form.on('change blur input', ':input', renderPreview);
      setTimeout(renderPreview, 0);

      var dialog = CRM.confirm({
        title: ts('Add shifts in bulk'),
        message: $form,
        options: {
          no: ts('Cancel'),
          yes: ts('Create shifts')
        },
        width: '600px'
      });

      dialog.on('crmConfirm:yes', function() {
        var parsed = parseBulkForm($form);
        if (!parsed.ok) {
          CRM.alert(parsed.error, ts('Invalid input'), 'error');
          return false;
        }

        var $tableBlockTarget = $('#crm-vol-define-needs-table');
        $tableBlockTarget.block();

        CRM.api3('VolunteerNeed', 'createbulk', parsed.params, true)
          .done(function(result) {
            $tableBlockTarget.unblock();
            if (result.is_error) {
              return;
            }
            var createdIds = _.keys(result.values || {});
            if (!createdIds.length) {
              return;
            }
            // Reload the needs list so new shifts show up with proper
            // formatted dates/times and the usual per-row edit controls.
            volunteerApp.Entities.getNeeds({'api.volunteer_assignment.getcount': {}})
              .done(function(arrData) {
                var scheduled = volunteerApp.Entities.Needs.getScheduled(arrData);
                collection.reset(scheduled.models);
                _.each(createdIds, function(id) {
                  Define.registerNeedChange('created', parseInt(id, 10));
                });
                CRM.alert(
                  ts('%1 shifts have been created. You can now modify or delete each one individually.', {1: createdIds.length}),
                  '',
                  'success'
                );
              });
          })
          .fail(function() {
            $tableBlockTarget.unblock();
          });
      });
    };

    /**
     * Places "Add shifts in bulk" inside .ui-dialog-buttonset, before Done.
     */
    Define.attachBulkButtonToDialog = function() {
      var $pane = CRM.$('#crm-volunteer-dialog').closest('.ui-dialog').find('.ui-dialog-buttonpane').first();
      var $buttonset = $pane.find('.ui-dialog-buttonset').first();
      if (!$pane.length || !$buttonset.length || !Define.collectionView || !Define.collectionView.collection) {
        return;
      }
      $pane.find('.crm-vol-define-bulk-footer-wrap').remove();
      var $wrap = CRM.$('<div class="crm-vol-define-bulk-footer-wrap"></div>');
      var $btn = CRM.$('<a href="#" id="crm-vol-define-add-bulk" class="button crm-hover-button"></a>');
      $btn.html('<span><div class="icon ui-icon-calendar"></div>' + ts('Add shifts in bulk') + '</span>');
      $wrap.append($btn);
      $buttonset.prepend($wrap);
      $btn.on('click', function(e) {
        e.preventDefault();
        Define.showBulkCreateDialog(Define.collectionView.collection);
      });
    };

    Define.detachBulkButtonFromDialog = function() {
      CRM.$('#crm-volunteer-dialog').closest('.ui-dialog').find('.crm-vol-define-bulk-footer-wrap').remove();
    };

    /**
     * Reads values from the bulk creation form and validates them.
     * Returns {ok: true, params: {...}} on success, or
     * {ok: false, error: '...'} on failure.
     */
    function parseBulkForm($form) {
      var roleId = $form.find('[name=role_id]').val();
      var durationHours = parseFloat($form.find('[name=duration_hours]').val());
      var count = parseInt($form.find('[name=count]').val(), 10);
      var interval = parseInt($form.find('[name=interval]').val(), 10) || 0;
      var intervalUnit = $form.find('[name=interval_unit]').val() || 'minute';
      var quantity = parseInt($form.find('[name=quantity]').val(), 10);
      var isPublic = $form.find('[name=visibility_id]').is(':checked');
      var isActive = $form.find('[name=is_active]').is(':checked');

      var startDateObj = $form.find('[name=start_date]').datepicker('getDate');
      var startTimeObj = $form.find('[name=start_time]').timeEntry('getTime');

      if (!roleId) {
        return {ok: false, error: ts('Please select a role.')};
      }
      if (!count || count < 1) {
        return {ok: false, error: ts('Number of shifts must be at least 1.')};
      }
      if (count > 1 && interval < 1) {
        return {ok: false, error: ts('Repeat interval must be at least 1 when creating multiple shifts.')};
      }
      if (!(durationHours > 0)) {
        return {ok: false, error: ts('Duration must be greater than zero.')};
      }
      if (!startDateObj) {
        return {ok: false, error: ts('Please choose a start date.')};
      }
      if (!startTimeObj) {
        return {ok: false, error: ts('Please choose a start time.')};
      }

      function pad(n) { n = String(n); return n.length === 1 ? '0' + n : n; }
      var startDate = startDateObj.getFullYear() + '-'
        + pad(startDateObj.getMonth() + 1) + '-'
        + pad(startDateObj.getDate());
      var startTime = startTimeObj.toTimeString().split(' ')[0];
      var duration = Math.round(durationHours * 60);

      var params = {
        project_id: volunteerApp.project_id,
        role_id: roleId,
        count: count,
        interval: interval,
        interval_unit: intervalUnit,
        duration: duration,
        start_date: startDate,
        start_time: startTime,
        quantity: quantity || 1,
        is_active: isActive ? 1 : 0,
        visibility_id: isPublic
          ? CRM.pseudoConstant.volunteer_need_visibility.public
          : CRM.pseudoConstant.volunteer_need_visibility.admin
      };
      return {ok: true, params: params};
    }
  });
}(CRM.ts('org.civicrm.volunteer')));
