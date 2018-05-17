import 'jquery';
import 'bootstrap/dist/js/bootstrap';
import './css/bootstrap-baqend.min.css';
import './css/custom.css';

let options;
let url;
let oldURL;
const emptyOptions = '?bqoptimize=1;';
let sizeRaw;

async function loadImage(isOptimized) {
  return fetch(isOptimized ? url + options : `${url}?bqoptimize=1`).then((response) => {
    const versionName = isOptimized ? 'optimized' : 'raw';
    document.getElementById(`imageInfo-content-type-${versionName}`).innerHTML = getType(response.headers.get('fastly-io-info'), isOptimized);
    document.getElementById(`imageInfo-content-length-${versionName}`).innerHTML = getSize(response.headers.get('fastly-io-info'), isOptimized);
    document.getElementById(`imageInfo-fastly-io-info-${versionName}`).innerHTML = getDimensions(response.headers.get('fastly-io-info'), isOptimized);
    return response;
  });
}

async function refreshOptimizedImage(providedOptions) {
  updateParameters(providedOptions);
  const response = await loadImage(true);
  const imgURL = URL.createObjectURL(await response.blob());

  document.getElementById('options').value = options;
  document.getElementById('image').src = imgURL;
}

function getType(fastlyHeader, isOptimized) {
  if (typeof fastlyHeader !== 'string') {
    return ' ';
  }

  const value = fastlyHeader.match(new RegExp(`(${isOptimized ? 'ofmt' : 'ifmt'}=)([^\\s]+)`));
  return value[2];
}

function getSize(fastlyHeader, isOptimized) {
  if (typeof fastlyHeader !== 'string') {
    return ' ';
  }

  const value = fastlyHeader.match(new RegExp(`(${isOptimized ? 'ofsz' : 'ifsz'}=)([^\\s]+)`));

  const size = Number(value[2]) / 1000;
  if (isOptimized) {
    if (sizeRaw > 0) {
      const saving = (`${100 * ((sizeRaw - size) / sizeRaw)}`).replace(/\..*/, '');
      return `${size}KB${sizeRaw > size ? ` (${saving}% saved)` : ''}`;
    }
    return `${size}KB`;
  }
  loadImage(true);
  sizeRaw = size;
  return `${size}KB`;
}

function getDimensions(fastlyHeader, isOptimized) {
  if (typeof fastlyHeader !== 'string') {
    return ' ';
  }
  const value = fastlyHeader.match(new RegExp(`(${isOptimized ? 'odim' : 'idim'}=)([^\\s]+)`));
  return value[2];
}

function updateParameters(providedOptions) {
  url = document.getElementById('url').value;
  if (url !== oldURL) {
    oldURL = url;
    loadImage(false);
  }
  options = document.getElementById('options').value;
  if (typeof providedOptions === 'object') {
    if (!options || options.length === 0) {
      options = emptyOptions;
    }

    for (const option in providedOptions) {
      if (providedOptions.hasOwnProperty(option)) {
        const value = providedOptions[option];
        const stringEncodedOption = value ? `;${option}=${value};` : '';

        const idxStart = options.indexOf(option);
        if (idxStart > -1) {
          let idxUntil = options.substring(idxStart).indexOf(';') + 1;
          idxUntil = idxUntil > 0 ? idxUntil : options.substring(idxStart).indexOf('&') + 1;
          idxUntil = idxUntil > 0 ? idxStart + idxUntil : options.length;
          options = options.substring(0, idxStart) + stringEncodedOption + options.substring(idxUntil, options.length);
        } else {
          options += stringEncodedOption;
        }
        options = options.replace(';;', ';');
      }
    }
  } else if (typeof providedOptions === 'string') {
    options = providedOptions;
  }

  if (options === emptyOptions) {
    options = '';
  }

  if (url && url.toLowerCase().indexOf('app.baqend.com') < 0) {
    document.getElementById('warning').classList.add('image-optimization-warning-visible');
  } else {
    document.getElementById('warning').classList.remove('image-optimization-warning-visible');
  }
}

function debounce(func, wait, immediate) {
  let timeout;
  return (...args) => {
    const context = this;
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}

const refreshOptimizedImageDelayed = debounce(refreshOptimizedImage, 300);

document.getElementById('url').value = 'https://io-sandbox.app.baqend.com/baqend.png';
refreshOptimizedImage({ width: 800, height: undefined });

$('body')
  .on('click', '.image-optimization-button', (e) => {
    const ioOptions = $(e.target).data('ioOptions');
    if (ioOptions !== undefined) {
      refreshOptimizedImage(ioOptions);
    }
  })
  .on('keyup', '.refresh-optimized-image-delayed', (e) => {
    refreshOptimizedImageDelayed();
  });
