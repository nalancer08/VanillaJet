class Functions {

  constructor() {

    // Dipper
    let dipper = global.dipper;

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
    scriptsKeys.push('jquery');
    scriptsKeys.push('underscore');
    dipper.registerScript('vanillaJet', dipper.script('core/vanillaJet.js'), scriptsKeys);
    dipper.enqueueScript('vanillaJet');

    // -- Main app
    dipper.registerScript('vanilla', dipper.script('vanilla.js'));
    dipper.enqueueScript('vanilla');

    const basicMeta = [
      { name: 'charset', content: 'UTF-8' },
      { name: 'viewport', content: 'width=device-width, minimum-scale=1' },
      { name: 'theme-color', content: '#ffffff' }
    ];

    const openGraphMeta = {
      'title': dipper.getPageTitle(),
      'site_name': dipper.getSiteTitle(),
      'description': dipper.getDescription(),
      'image': dipper.img('logo.png'),
      'type': 'website',
      'url': dipper.urlTo('')
    };

    // Add basic meta tags
    basicMeta.forEach(meta => {
      dipper.addMeta(meta.name, meta.content);
    });

    // Add Open Graph meta tags
    Object.entries(openGraphMeta).forEach(([key, value]) => {
      dipper.addMeta(`og:${key}`, value, 'property');
    });
  }
}

module.exports = Functions;
