<div class="crm-block crm-volunteer-signup-form-block">

  <div class="help">
    <p>
      {ts domain='org.civicrm.volunteer'}Thank you for being a volunteer! You are registering for the following volunteer commitments:{/ts}
    </p>
  </div>

  <div class="crm-volunteer-signup-summary">
    <table>
      <tr>
        <th class="crm-vol-opp-project">{ts domain='org.civicrm.volunteer'}Project Title{/ts}</th>
        <th class="crm-vol-opp-beneficiary">{ts domain='org.civicrm.volunteer'}Project Beneficiaries{/ts}</th>
        <th class="crm-vol-opp-role">{ts domain='org.civicrm.volunteer'}Role{/ts}</th>
        <th class="crm-vol-opp-time">{ts domain='org.civicrm.volunteer'}Date and Time{/ts}</th>
      </tr>
      {foreach from=$volunteerNeeds key=key item=volunteerNeed}
        <tr>
          <td class="crm-vol-opp-project">
            {$volunteerNeed.project.title}
            {if $volunteerNeed.project.description}
              <div class="crm-vol-inline-detail">{$volunteerNeed.project.description}</div>
            {/if}
          </td>
          <td class="crm-vol-opp-beneficiary">{$volunteerNeed.project.beneficiaries}</td>
          <td class="crm-vol-opp-role">
            {$volunteerNeed.role_label}
            {if $volunteerNeed.role_description}
              <div class="crm-vol-inline-detail">{$volunteerNeed.role_description}</div>
            {/if}
            {if $volunteerNeed.notes}
              <div class="crm-vol-inline-notes">{$volunteerNeed.notes|escape|nl2br}</div>
            {/if}
          </td>
          <td class="crm-vol-opp-time">{$volunteerNeed.display_time}</td>
        </tr>
      {/foreach}
    </table>
  </div>

  <div class="help">
    <p>
      {ts domain='org.civicrm.volunteer'}Please provide the following information and submit the form to complete your registration.{/ts}
    </p>
  </div>

  <div class="crm-volunteer-signup-profiles">
    {foreach from=$customProfiles key=ufID item=ufFields }
      {include file="CRM/UF/Form/Block.tpl" fields=$ufFields}
    {/foreach}
  </div>

  {if $allowAdditionalVolunteers}

    <fieldset class="crm-volunteer-additional-volunteers-section">
      <legend>{ts domain='org.civicrm.volunteer'}Additional Volunteers{/ts}</legend>
      <div class="crm-section">
        <div class="label">{$form.additionalVolunteerQuantity.label}</div>
        <div class="content">{$form.additionalVolunteerQuantity.html}</div>
        <div class="clear"></div>
      </div>

      <div class="crm-volunteer-additional-volunteers" id="additionalVolunteers">
        {if $additionalVolunteerProfiles}
          {foreach from=$additionalVolunteerProfiles item=additionalVolunteer }
            <div class='additional-volunteer-profile'>
              {foreach from=$additionalVolunteer.profiles key=ufID item=ufFields }
                {include file="CRM/UF/Form/Block.tpl" fields=$ufFields prefix=$additionalVolunteer.prefix}
              {/foreach}
              <div class="clear"></div>
            </div>
          {/foreach}
        {/if}
      </div>
    </fieldset>
  {/if}

  <div>
    {include file="CRM/common/formButtons.tpl" location="bottom"}
  </div>
</div>

{if $allowAdditionalVolunteers}
</form>
<form>
  <div class="crm-volunteer-additional-volunteers-template">
    <div class='additional-volunteer-profile'>
      {foreach from=$additionalVolunteersTemplate key=ufID item=ufFields }
        {include file="CRM/UF/Form/Block.tpl" fields=$ufFields prefix='additionalVolunteersTemplate'}
      {/foreach}
      <div class="clear"></div>
    </div>
  </div>
{/if}

{include file="CRM/common/notifications.tpl" location="bottom"}
