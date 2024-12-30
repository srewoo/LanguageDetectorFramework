// Sample locators for Call AI page

const locators = {
    loginButton: 'button[type="button"] span',
    usernameInput: 'input[name="username"]',
    passwordInput: 'input[name="password"]',
    signInButton: 'button[role="button"]:has-text("Sign in")',
    shareBtnRecDetails:'.share-icon',
    shareOutsideOrg:'.cai-dropdown-menu-item.cai-dropdown-menu-item-only-child:nth-of-type(2)',
    shareEmailfield: 'div.selectionDropdownInput > div > div > div',
    extshareEmailSelect: '#rc_select_0',
    shareTextfield: '.mentionBox__input',
    shareDownload:'button[role="button"]:has-text("Download")',
    shareCompleteRecording:'.icon.icon-iconVideo',
    shareSnippetRecording:'.icon.icon-iconSnippet',
    shareSend:'[data-testid="undefined-action-button-done"]',
};

module.exports = locators;