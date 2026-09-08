/* Iron Log backend configuration.
 *
 * Paste your Supabase project's URL and *anon* (public) key below, then
 * redeploy. See SETUP.md for the 5-minute walkthrough.
 *
 * Leaving these blank runs Iron Log in LOCAL-ONLY mode (single device, no
 * accounts, no community) — exactly how it worked before. Filling them in
 * turns on accounts, cloud sync and the People tab.
 *
 * The anon key is SAFE to commit and ship to the browser — it is a public
 * client key. Your data is protected by row-level security in the database,
 * not by hiding this key. Never put the *service_role* key here.
 */
window.IRONLOG_CONFIG = {
  supabaseUrl: '',
  supabaseAnonKey: '',
};
