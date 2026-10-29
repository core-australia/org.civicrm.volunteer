<?php

/**
 * Public volunteer pages: log in the UF-matched CMS user from a Civi checksum,
 * otherwise send anonymous visitors to the CMS login.
 *
 * Civi checksums identify a contact; they do not create a CMS session.
 * CiviVolunteer Angular then calls civicrm/ajax/rest, which checks CMS
 * capabilities, so without this a cid/cs link stays anonymous and 403s.
 *
 * Runs from hook_civicrm_config so the CMS user is in place before the
 * WordPress Civi plugin syncs the user and before Angular::load() bakes
 * CRM.permissions.
 *
 * Pretty /civicrm/… URLs are the nginx front controller (#1575), not this class.
 */
class CRM_Volunteer_Checksum {

  /**
   * Front-end volunteer routes that require a CMS session.
   *
   * Longer paths first so a REQUEST_URI fallback does not treat
   * civicrm/volunteer/signup as civicrm/vol.
   *
   * @var string[]
   */
  private static $frontEndPaths = array(
    'civicrm/volunteer/signup',
    'civicrm/volunteer/join',
    'civicrm/vol',
  );

  /**
   * Query keys that are login/front-controller mechanics, not Angular listing params.
   *
   * @var string[]
   */
  private static $dropFromReturn = array(
    'cid',
    'cs',
    'reset',
    'civiwp',
    'q',
    'pagename',
    'snippet',
    'page',
    'noheader',
  );

  /**
   * @var bool
   */
  private static $booted = FALSE;

  public static function boot() {
    if (self::$booted || PHP_SAPI === 'cli') {
      return;
    }
    self::$booted = TRUE;

    if (!self::isFrontEndRequest()) {
      return;
    }

    self::maybeLoginFromChecksum();
    self::requireCmsLogin();
  }

  /**
   * @return string|null
   */
  public static function currentPath() {
    $path = trim((string) CRM_Utils_System::currentPath(), '/');
    if ($path !== '') {
      return in_array($path, self::$frontEndPaths, TRUE) ? $path : NULL;
    }
    if (!empty($_GET['q']) && is_string($_GET['q'])) {
      $q = trim($_GET['q'], '/');
      if (in_array($q, self::$frontEndPaths, TRUE)) {
        return $q;
      }
    }
    $uri = (string) ($_SERVER['REQUEST_URI'] ?? '');
    $urlPath = (string) (parse_url($uri, PHP_URL_PATH) ?? '');
    foreach (self::$frontEndPaths as $needle) {
      if (preg_match('#(?:^|/)' . preg_quote($needle, '#') . '(?:/|$)#', $urlPath)) {
        return $needle;
      }
    }
    return NULL;
  }

  /**
   * @return bool
   */
  public static function isFrontEndRequest() {
    $path = self::currentPath();
    return $path && in_array($path, self::$frontEndPaths, TRUE);
  }

  /**
   * CMS login, not a Civi contact in the PHP session.
   *
   * A donate checksum can set Civi userID without a WordPress cookie; treating
   * that as logged-in skips wp_set_auth_cookie and the listing ajax 403s.
   *
   * @return bool
   */
  private static function isCmsLoggedIn() {
    if (function_exists('is_user_logged_in')) {
      return is_user_logged_in();
    }
    return (bool) CRM_Core_Session::getLoggedInContactID();
  }

  private static function maybeLoginFromChecksum() {
    if (self::isCmsLoggedIn()) {
      return;
    }

    $cid = CRM_Utils_Request::retrieve('cid', 'Positive');
    $cs = CRM_Utils_Request::retrieve('cs', 'String');
    if (!$cid || !is_string($cs) || $cs === '') {
      return;
    }
    if (!CRM_Contact_BAO_Contact_Utils::validChecksum($cid, $cs)) {
      return;
    }

    $ufId = (int) CRM_Core_BAO_UFMatch::getUFId($cid);
    if ($ufId < 1) {
      return;
    }

    $username = self::cmsUsername($ufId);
    if ($username === '') {
      return;
    }

    CRM_Core_Config::singleton()->userSystem->loadUser($username);

    // loadUser should set the CMS user; set it again and mint a cookie so this
    // request and later civicrm/ajax/rest calls are authenticated.
    if (function_exists('wp_set_current_user')) {
      wp_set_current_user($ufId);
    }
    if (function_exists('wp_set_auth_cookie')) {
      wp_set_auth_cookie($ufId, FALSE, function_exists('is_ssl') && is_ssl());
    }
    if (function_exists('get_user_by') && function_exists('do_action')) {
      $user = get_user_by('id', $ufId);
      if ($user) {
        do_action('wp_login', $user->user_login, $user);
      }
    }
  }

  /**
   * @param int $ufId
   * @return string
   */
  private static function cmsUsername($ufId) {
    if (function_exists('get_user_by')) {
      $user = get_user_by('id', $ufId);
      if ($user && !empty($user->user_login)) {
        return (string) $user->user_login;
      }
    }
    return '';
  }

  private static function requireCmsLogin() {
    if (self::isCmsLoggedIn()) {
      return;
    }

    $path = self::currentPath();
    $params = self::returnQueryParams();
    $query = $params ? http_build_query($params) : '';
    $fragment = NULL;
    if ($path === 'civicrm/vol') {
      $fragment = '/volunteer/opportunities' . ($query !== '' ? '?' . $query : '');
      $query = '';
    }
    $dest = CRM_Utils_System::url($path, $query, TRUE, $fragment, FALSE, TRUE);
    $login = CRM_Core_Config::singleton()->userSystem->getLoginURL($dest);
    CRM_Utils_System::redirect($login);
  }

  /**
   * Angular listing params from the request (project, dest, hideSearch, needs).
   *
   * @return array
   */
  private static function returnQueryParams() {
    if (empty($_GET) || !is_array($_GET)) {
      return array();
    }
    $params = array();
    foreach ($_GET as $key => $value) {
      if (!is_string($key) || in_array($key, self::$dropFromReturn, TRUE)) {
        continue;
      }
      $params[$key] = $value;
    }
    return $params;
  }

}
