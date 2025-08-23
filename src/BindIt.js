function bindIt(obj, base = '') {
  for (let key in obj) {
    // Make sure all child objects are proxied too
    if (obj.hasOwnProperty(key) && Object.prototype.toString.call(obj[key]) === '[object Object]') {
      obj[key] = bindIt(obj[key], `${base ? base + '.' : ''}${key}`);
    }
    // ...as well as arrays
    if (obj.hasOwnProperty(key) && Object.prototype.toString.call(obj[key]) === '[object Array]') {
      obj[key] = new Proxy(obj[key], arrayHander);
    }
  }

  function wrapArray(obj, prop, bindKey) {
    let arrayHandler = {
      apply: function (fn, arr, argumentsList) {
        obj[prop]._push(argumentsList);
        triggerUpdate(bindKey, obj[prop]);
      }
    };
    if (Object.prototype.toString.call(obj[prop]) === '[object Array]') {
      obj[prop]._push = obj[prop].push;
      obj[prop].push = new Proxy(obj[prop].push, arrayHandler);
    }
  }

  function triggerUpdate(bindKey, value) {
    let elements = document.querySelectorAll(`[bind-it-to='${bindKey}']`);
    requestAnimationFrame(() => {
      for (let element of elements) {
        let bindType = element.getAttribute('bind-it-with') || 'innerText';
        switch (bindType) {
          case 'innerText':
            element.innerText = value;
            break;
          case 'value':
            element.value = value;
            break;
          default:
            if (typeof window[bindType] === 'function') {
              window[bindType].apply(element, [value]);
            }
            break;
        }

      }
    });
  }

  let handler = {
    get: function (obj, key) {
      if (typeof key === 'string') {
        // Ensure safe deep get/set (no need to set up the structute)
        if (obj[key] === undefined) obj[key] = bindIt({}, `${base ? base + '.' : ''}${key}`);
        return obj[key];
      }
    },

    set: function (obj, prop, value) {
      const bindKey = `${base ? base + '.' : ''}${prop}`;
      // Set the new value
      obj[prop] = value;
      // Handle arrays
      wrapArray(obj, prop, bindKey);
      // Handle bindings
      triggerUpdate(bindKey, obj[prop]);
      return obj;
    }
  };

  let proxied = new Proxy(obj, handler);

  // Handle two-way and initial bind
  if (base === '') {
    let elements = document.querySelectorAll(`[bind-it-to]`);
    for (let element of elements) {
      let key = element.getAttribute('bind-it-to');
      let keyParts = key.split('.');
      let wantedValue = obj;
      while (keyParts.length) {
        wantedValue = wantedValue[keyParts.splice(0, 1)];
      }
      triggerUpdate(key, wantedValue);
    }

    let twoWayElements = document.querySelectorAll(`[bind-it-two-way]`);
    for (let element of twoWayElements) {
      element.addEventListener('change', function () {
        let prop = this.getAttribute('bind-it-to');
        proxied[prop] = this.value
      });
    }
  }

  return proxied;
}
