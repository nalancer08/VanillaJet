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
    dipper.registerScript('vanillaJet', dipper.script('core/vanillaJet.min.js'), scriptsKeys);
    dipper.enqueueScript('vanillaJet');

    // -- Main app
    dipper.registerScript('vanilla', dipper.script('vanilla.min.js'));
    dipper.enqueueScript('vanilla');

    // Add basic meta tags
    const basicMeta = [
      { name: 'charset', attribute: 'UTF-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=5.0' },
      { name: 'theme-color', content: '#ffffff' }
    ];
    basicMeta.forEach(meta => {
      dipper.addMeta({
        name: meta.name,
        content: meta.content || null,
        attribute: meta.attribute || null
      });
    });

    // Add Open Graph meta tags
    const openGraphMeta = {
      'og:title': dipper.getPageTitle(),
      'og:site_name': dipper.getSiteTitle(),
      'og:description': dipper.getDescription(),
      'og:image': dipper.img('logo.png'),
      'og:type': 'website',
      'og:url': dipper.urlTo(''),
      'og:locale': 'es_MX',
    };
    Object.entries(openGraphMeta).forEach(([key, value]) => {
      dipper.addMeta({
        name: key,
        content: value,
        attribute: 'property'
      });
    });
  }
}

module.exports = Functions;
