{*
+--------------------------------------------------------------------+
| CiviCRM version 4.4                                                |
+--------------------------------------------------------------------+
| Copyright CiviCRM LLC (c) 2004-2013                                |
+--------------------------------------------------------------------+
| This file is a part of CiviCRM.                                    |
|                                                                    |
| CiviCRM is free software; you can copy, modify, and distribute it  |
| under the terms of the GNU Affero General Public License           |
| Version 3, 19 November 2007 and the CiviCRM Licensing Exception.   |
|                                                                    |
| CiviCRM is distributed in the hope that it will be useful, but     |
| WITHOUT ANY WARRANTY; without even the implied warranty of         |
| MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.               |
| See the GNU Affero General Public License for more details.        |
|                                                                    |
| You should have received a copy of the GNU Affero General Public   |
| License and the CiviCRM Licensing Exception along                  |
| with this program; if not, contact CiviCRM LLC                     |
| at info[AT]civicrm[DOT]org. If you have questions about the        |
| GNU Affero General Public License or the licensing of CiviCRM,     |
| see the CiviCRM license FAQ at http://civicrm.org/licensing        |
+--------------------------------------------------------------------+
*}
{strip}
{* Contains js templates for backbone-based volunteer needs sub-application *}

<script type="text/template" id="crm-vol-define-layout-tpl">
  <div id="help">
    {* VOL-47: The following is on one line intentionally. *}
    {ts domain='org.civicrm.volunteer'}Use this form to specify the number of volunteers needed for each role and time slot. If no opportunities are specified, volunteers will be considered to be generally available.{/ts}
    {help id="volunteer-define" file="CRM/Volunteer/Page/Backbone/Define.hlp" isModulePermissionSupported="$isModulePermissionSupported"}
  </div>
  <form class="crm-block crm-form-block crm-event-manage-volunteer-form-block">
    <div id="crm-vol-define-scheduled-needs-region">
      <div class="crm-loading-element">{ts domain='org.civicrm.volunteer'}Loading{/ts}...</div>
    </div>
  </form>
</script>

<script type="text/template" id="crm-vol-define-table-tpl">
  <table id="crm-vol-define-needs-table">
    <thead>
      <tr>
        <th id="role_id">{ts domain='org.civicrm.volunteer'}Role{/ts}</th>
        <th id="quantity">{ts domain='org.civicrm.volunteer'}Volunteers Needed{/ts}</th>
        <th id="time_components">{ts domain='org.civicrm.volunteer'}Time{/ts}</th>
        <th id="notes">{ts domain='org.civicrm.volunteer'}Notes{/ts}</th>
        <th id="visibility">{ts domain='org.civicrm.volunteer'}Public?{/ts}</th>
        <th>Enabled?</th>
        <th></th>
      </tr>
    </thead>
    <tbody></tbody>
  </table>
</script>

<script type="text/template" id="crm-vol-define-scheduled-need-tpl">
  <td>
    {literal}
      <%= RenderUtil.select({
      apiEntity: 'volunteer_need',
      apiField: 'role_id',
      name: 'role_id',
      optionEditPath: 'civicrm/admin/options/volunteer_role',
      options: pseudoConstant.volunteer_role,
      selected: role_id
      }) %>
    {/literal}
  </td>
  <td><input type="number" class="crm-form-text" name="quantity" value="<%= quantity %>" min="0" step="1" size="4"></td>
  <td>
    <label>
    {ts domain='org.civicrm.volunteer'}Schedule Type:{/ts}
      <select name="schedule_type">
        <option value="">
    {ts domain='org.civicrm.volunteer'}- select one -{/ts}
        </option>
        <option value="shift">
    {ts domain='org.civicrm.volunteer'}Set shift{/ts}
        </option>
        <option value="flexible">
    {ts domain='org.civicrm.volunteer'}Flexible timeframe{/ts}
        </option>
        <option value="open">
          {ts domain='org.civicrm.volunteer'}Open-Ended{/ts}
        </option>
      </select>
          {help id="volunteer-define-schedule_type" file="CRM/Volunteer/Page/Backbone/Define.hlp"}
    </label>
    <table class="time_components">
      <thead>
        <tr>
          <th class="start_datetime">{ts domain='org.civicrm.volunteer'}Start Date/Time{/ts}</th>
          <th class="end_datetime">
          {ts domain='org.civicrm.volunteer'}End Date/Time{/ts}
          </th>
          <th class="duration">{ts domain='org.civicrm.volunteer'}Minutes{/ts}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="start_datetime">
            <input type="text" class="crm-form-text dateplugin" name="display_start_date"  value="<%= display_start_date %>" size="20">
            <input type="text" class="crm-form-text" name="display_start_time" size="10">
          </td>
          <td class="end_datetime">
            <input type="text" class="crm-form-text dateplugin" name="display_end_date"  value="<%= display_end_date %>" size="20">
            <input type="text" class="crm-form-text" name="display_end_time" size="10">
          </td>
          <td class="duration">
            <input type="text" class="crm-form-text" name="duration" value="<%= duration %>" size="6">
          </td>
        </tr>
      </tbody>
    </table>
  </td>
  <td class="crm-vol-need-notes">
    <button type="button" class="crm-vol-edit-notes" title="{ts escape='htmlattribute' domain='org.civicrm.volunteer'}Notes for volunteers signing up to this shift{/ts}">
      <i class="crm-i fa-sticky-note-o" role="img" aria-hidden="true"></i>
      <span class="crm-vol-notes-label">{ts domain='org.civicrm.volunteer'}Add notes{/ts}</span>
    </button>
  </td>
  <td><input type="checkbox" name="visibility_id" value="<%= visibilityValue %>"></td>
  <td><input type="checkbox" name="is_active" value="1"></td>
  <td><a href="#" class="crm-vol-del action-item crm-hover-button small-popup" title="{ts escape='htmlattribute' domain='org.civicrm.volunteer'}Delete{/ts}">{ts}Delete{/ts}</a></td>
</script>

<script type="text/template" id="crm-vol-define-flexible-need-tpl">
  <td colspan="9">
    <input type="checkbox" name="visibility_id" id="crm-vol-visibility-id" value="<%= visibilityValue %>">
    <label for="crm-vol-visibility-id">Allow users to sign up without specifying a shift.</label>
  </td>
</script>

<script type="text/template" id="crm-vol-define-add-row-tpl">
  <tr id="crm-vol-define-add-row">
    <td colspan="9">
      <select class="crm-form-select crm-action-menu action-icon-plus" id="crm-vol-define-add-need">
        <option value="">{ts domain='org.civicrm.volunteer'}New Opportunity{/ts}</option>
        {crmAPI var='result' entity='VolunteerNeed' action='getoptions' field='role_id' sequential=0}
        {foreach from=$result.values item=VolunteerNeed key=id}
          <option value="{$id}">{$VolunteerNeed}</option>
        {/foreach}
      </select>
    </td>
  </tr>
</script>

<script type="text/template" id="crm-vol-define-bulk-form-tpl">
  <form class="crm-block crm-form-block crm-vol-define-bulk-form">
    <p class="description">
      {ts domain='org.civicrm.volunteer'}Generate a set of shifts by describing a simple repeating pattern. Each generated shift will appear in the list below, where you can individually modify or delete them.{/ts}
    </p>
    <table class="form-layout-compressed">
      <tr>
        <td class="label"><label for="crm-vol-bulk-role">{ts domain='org.civicrm.volunteer'}Role{/ts}</label></td>
        <td>
          <select id="crm-vol-bulk-role" name="role_id" class="crm-form-select crm-select2 required">
            {crmAPI var='bulkRoles' entity='VolunteerNeed' action='getoptions' field='role_id' sequential=0}
            {foreach from=$bulkRoles.values item=roleLabel key=roleId}
              <option value="{$roleId}">{$roleLabel}</option>
            {/foreach}
          </select>
        </td>
      </tr>
      <tr>
        <td class="label"><label for="crm-vol-bulk-start-date">{ts domain='org.civicrm.volunteer'}Start date{/ts}</label></td>
        <td><input type="text" id="crm-vol-bulk-start-date" name="start_date" class="crm-form-text required" size="20"></td>
      </tr>
      <tr>
        <td class="label"><label for="crm-vol-bulk-start-time">{ts domain='org.civicrm.volunteer'}Start time{/ts}</label></td>
        <td>
          <input type="text" id="crm-vol-bulk-start-time" name="start_time" class="crm-form-text required" size="10">
        </td>
      </tr>
      <tr class="crm-vol-define-bulk-hint-row">
        <td class="label"></td>
        <td><span class="crm-vol-define-bulk-hint">{ts domain='org.civicrm.volunteer'}Start time for the first shift of each day.{/ts}</span></td>
      </tr>
      <tr>
        <td class="label"><label for="crm-vol-bulk-duration">{ts domain='org.civicrm.volunteer'}Duration (hours){/ts}</label></td>
        <td>
          <input type="number" id="crm-vol-bulk-duration" name="duration_hours" class="crm-form-text required" value="1" min="0" step="0.25" size="6">
        </td>
      </tr>
      <tr>
        <td class="label"><label for="crm-vol-bulk-count">{ts domain='org.civicrm.volunteer'}Number of shifts{/ts}</label></td>
        <td><input type="number" id="crm-vol-bulk-count" name="count" class="crm-form-text required" value="1" min="1" size="4"></td>
      </tr>
      <tr>
        <td class="label"><label for="crm-vol-bulk-interval">{ts domain='org.civicrm.volunteer'}Repeat every{/ts}</label></td>
        <td>
          <input type="number" id="crm-vol-bulk-interval" name="interval" class="crm-form-text" value="0" min="0" size="4" style="width:4em">
          <select name="interval_unit" class="crm-form-select">
            <option value="minute">{ts domain='org.civicrm.volunteer'}minutes{/ts}</option>
            <option value="hour">{ts domain='org.civicrm.volunteer'}hours{/ts}</option>
            <option value="day" selected>{ts domain='org.civicrm.volunteer'}days{/ts}</option>
            <option value="week">{ts domain='org.civicrm.volunteer'}weeks{/ts}</option>
          </select>
        </td>
      </tr>
      <tr class="crm-vol-define-bulk-hint-row">
        <td class="label"></td>
        <td><span class="crm-vol-define-bulk-hint">{ts domain='org.civicrm.volunteer'}Gap between the start of each shift. Set to 0 (or leave count at 1) for a single shift.{/ts}</span></td>
      </tr>
      <tr>
        <td class="label"><label for="crm-vol-bulk-quantity">{ts domain='org.civicrm.volunteer'}Volunteers needed per shift{/ts}</label></td>
        <td><input type="number" id="crm-vol-bulk-quantity" name="quantity" class="crm-form-text required" value="1" min="1" size="4"></td>
      </tr>
      <tr>
        <td class="label"><label for="crm-vol-bulk-public">{ts domain='org.civicrm.volunteer'}Public?{/ts}</label></td>
        <td><input type="checkbox" id="crm-vol-bulk-public" name="visibility_id" checked></td>
      </tr>
      <tr>
        <td class="label"><label for="crm-vol-bulk-active">{ts domain='org.civicrm.volunteer'}Enabled?{/ts}</label></td>
        <td><input type="checkbox" id="crm-vol-bulk-active" name="is_active" checked></td>
      </tr>
    </table>
    <div class="crm-vol-bulk-preview" style="margin-top: 1em;"></div>
  </form>
</script>
{/strip}
