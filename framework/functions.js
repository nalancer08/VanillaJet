class Functions {

  constructor() {

    // Dipper
    dipper = global.dipper;

    // -- Hydrate
    Functions.hydrate(dipper);
  }
  
  static hydrate(dipper) {

    // -- Get vanillaJet.package.json
    let json = dipper.openJsonFile('vanillaJet.package.json');

    // -- Google Fonts
    if (json.fonts && json.fonts.length > 0) {
      dipper.registerStyle('google-fonts', dipper.get_google_fonts(json.fonts));
    }

    // - Styles
    let stylesKeys = [];
    if (json.styles) {

      // -- Gettign the keys
      stylesKeys = Object.keys(json.styles);

      // -- Add google-fonts to keys
      stylesKeys.push('google-fonts');

      // -- Adding styles
      for (let key in json.styles) {
        // -- Check if init with http or https
        let url = json.styles[key];
        if (!/^(https?:\/\/|\/\/)/.test(url)) {
          dipper.registerStyle(key, dipper.style(url));
        } else {
          dipper.registerStyle(key, url);
        }
      }
    }
    dipper.registerStyle('app', dipper.style('app.min.css'), stylesKeys);
    dipper.enqueueStyle('app');

    // -- Core dependencies - Base scripts
    for (let key in json.coreDependencies) {
      dipper.registerScript(key, json.coreDependencies[key]);
    }

    // -- Scripts
    let scriptsKeys = [];
    if (json.dependencies) {

      // -- Adding scripts
      for (let key in json.dependencies) {

        // -- Key name and requires
        let keyParts = key.split(':');
        let keyName = keyParts[0];
        let keyRequires = keyParts[1] || '';

        // -- Add key to scriptsKeys
        scriptsKeys.push(keyName);

        // -- Check if init with http or https
        let url = json.dependencies[key];
        if (!/^(https?:\/\/|\/\/)/.test(url)) {
          dipper.registerScript(
            keyName,
            dipper.script(url),
            (keyRequires !== '') ? [keyRequires] : undefined
          );
        } else {
          dipper.registerScript(
            keyName,
            url,
            (keyRequires !== '') ? [keyRequires] : undefined
          );
        }
      }
    }
    /*scriptsKeys.push('jquery');
    scriptsKeys.push('underscore');
    dipper.registerScript('vanillaJet', dipper.script('core/vanillaJet.js'), scriptsKeys);
    dipper.enqueueScript('vanillaJet');*/

    // -- Main app
    dipper.registerScript('vanilla', dipper.script('vanilla.js'));
    dipper.enqueueScript('vanilla');

    // Adding meta tags
    dipper.addMeta('UTF-8', '', 'charset');
    dipper.addMeta('viewport', 'width=device-width, minimum-scale=1');
    dipper.addMeta('og:title', dipper.getPageTitle(), 'property');
    dipper.addMeta('og:site_name', dipper.getSiteTitle(), 'property');
    dipper.addMeta('og:description', dipper.getDescription(), 'property');
    dipper.addMeta('og:image', dipper.img('logo.png'), 'property');
    dipper.addMeta('og:type', 'website', 'property');
    dipper.addMeta('og:url', dipper.urlTo(''), 'property');
    dipper.addMeta('theme-color', '#ffffff', '');
  }
}

module.exports = Functions;
