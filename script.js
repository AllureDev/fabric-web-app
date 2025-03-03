// Google Sheet JSON URL for "Sample Fabrics"
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1OaLsjBSqyZyGsqN-qnCh-JB4E0QfUlAX_5Rgam5pIkY/gviz/tq?tqx=out:json&sheet=Sample Fabrics';

// Debounce utility
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Placeholder image (base64 encoded gray square)
const PLACEHOLDER_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

async function fetchFabrics() {
    try {
        console.log('Fetching data from:', SHEET_URL);
        const response = await fetch(SHEET_URL, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache',
        });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const text = await response.text();
        console.log('Raw response length:', text.length);

        const json = JSON.parse(text.slice(47, -2));
        const rows = json.table.rows;
        const cols = json.table.cols;
        console.log('Parsed rows:', rows.length);

        const headerMap = {};
        cols.forEach((col, index) => {
            headerMap[col.label] = index;
        });

        const allHeaders = ["SKU", "Type", "Name", "Family", "Colour", "Band Width", "Roll Width", "Schedule", "Status", "Image Link", "Ordering Status"];

        const fabrics = rows.map(row => {
            const fabric = {};
            allHeaders.forEach(header => {
                const cellValue = row.c[headerMap[header]];
                let value = cellValue?.v || '';
                
                if (header === "Band Width" && value !== '') {
                    const stringValue = String(value);
                    const numericMatch = stringValue.match(/^\d+(\.\d+)?/);
                    const numericValue = numericMatch ? parseFloat(numericMatch[0]) : '';
                    fabric[header] = numericValue;
                } else {
                    fabric[header] = value;
                }
            });

            if (fabric["Image Link"] && typeof fabric["Image Link"] === 'string' && fabric["Image Link"].trim() !== '') {
                try {
                    new URL(fabric["Image Link"]);
                    fabric.hasValidImage = true;
                    fabric.imageLink = fabric["Image Link"].startsWith('http') ? fabric["Image Link"] : `https://${fabric["Image Link"]}`;
                } catch (e) {
                    fabric.hasValidImage = false;
                    console.warn('Invalid image URL for fabric:', fabric.Name);
                }
            } else {
                fabric.hasValidImage = false;
                console.warn('No image link provided for fabric:', fabric.Name);
            }

            return fabric;
        });

        const fabricsWithImages = fabrics.filter(fabric => fabric.hasValidImage);
        console.log('Fabrics with valid images:', fabricsWithImages.length, 'out of', fabrics.length);

        window.allFabricData = fabrics;
        displayFabrics(fabricsWithImages);
        setupFilters(fabricsWithImages);
        setupFilterButton();
    } catch (error) {
        console.error('Error fetching fabrics:', error);
        document.getElementById('fabricGrid').innerHTML = '<p>Error loading fabrics. Please try again later or check the console for details.</p>';
    }
}

function displayFabrics(fabrics, isFilterUpdate = false) {
    const grid = document.getElementById('fabricGrid');
    grid.innerHTML = '';

    if (fabrics.length === 0) {
        grid.innerHTML = '<p>No matching fabrics found.</p>';
        return;
    }

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const imageContainer = entry.target;
                const img = imageContainer.querySelector('img');
                img.onload = () => {
                    imageContainer.classList.add('loaded');
                };
                img.onerror = () => {
                    console.error('Image failed to load:', img.dataset.src);
                    img.src = PLACEHOLDER_IMAGE;
                    imageContainer.classList.add('loaded');
                };
                img.src = img.dataset.src;
                observer.unobserve(imageContainer);
            }
        });
    }, { rootMargin: '0px 0px 200px 0px' });

    fabrics.forEach(fabric => {
        if (!fabric.hasValidImage) return;

        const card = document.createElement('div');
        card.className = 'fabric-card';
        if (fabric["Ordering Status"] === "Low Stock") {
            card.classList.add('low-stock');
        }

        const imageContainer = document.createElement('div');
        imageContainer.className = 'image-container';

        const placeholder = document.createElement('div');
        placeholder.className = 'placeholder shimmer';

        const img = document.createElement('img');
        img.alt = fabric.Name || 'Fabric';

        if (isFilterUpdate) {
            img.src = fabric.imageLink;
            img.onload = () => {
                imageContainer.classList.add('loaded');
            };
            img.onerror = () => {
                console.error('Image failed to load:', img.src);
                img.src = PLACEHOLDER_IMAGE;
                imageContainer.classList.add('loaded');
            };
        } else {
            img.dataset.src = fabric.imageLink;
            observer.observe(imageContainer);
        }

        imageContainer.appendChild(placeholder);
        imageContainer.appendChild(img);
        card.appendChild(imageContainer);

        const nameP = document.createElement('p');
        nameP.innerHTML = `<strong>${fabric.Name || 'Unnamed Fabric'}</strong>`;
        card.appendChild(nameP);

        card.addEventListener('click', () => showFabricDetails(fabric));
        grid.appendChild(card);
    });
}

function showFabricDetails(fabric) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">×</span>
            <div class="modal-image-wrapper">
                <img src="${fabric.imageLink}" alt="${fabric.Name}">
                <div class="magnifier"></div>
            </div>
            <h2>${fabric.Name || 'Unnamed Fabric'}</h2>
            <div class="details">
                <strong>SKU:</strong> <span>${fabric.SKU || 'N/A'}</span>
                <strong>Type:</strong> <span>${fabric.Type || 'N/A'}</span>
                <strong>Family:</strong> <span>${fabric.Family || 'N/A'}</span>
                <strong>Colour:</strong> <span>${fabric.Colour || 'N/A'}</span>
                <strong>Band Width:</strong> <span>${fabric["Band Width"] != null && fabric["Band Width"] !== '' ? fabric["Band Width"] : 'N/A'}</span>
                <strong>Roll Width:</strong> <span>${fabric["Roll Width"] || 'N/A'}</span>
                <strong>Schedule:</strong> <span>${fabric.Schedule || 'N/A'}</span>
                <strong>Status:</strong> <span>${fabric.Status || 'N/A'}</span>
                <strong>Ordering:</strong> <span>${fabric["Ordering Status"] || 'N/A'}</span>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    const modalImg = modal.querySelector('img');
    const magnifier = modal.querySelector('.magnifier');
    const imageWrapper = modal.querySelector('.modal-image-wrapper');

    modalImg.onerror = function() {
        console.error('Full image failed to load:', this.src);
        this.src = PLACEHOLDER_IMAGE;
    };

    let isImageLoaded = false;
    modalImg.onload = () => {
        isImageLoaded = true;
    };

    // Magnifier Logic
function updateMagnifier(e, clientX, clientY) {
    if (!isImageLoaded) return;

    const rect = modalImg.getBoundingClientRect();
    const imgWidth = modalImg.offsetWidth;
    const imgHeight = modalImg.offsetHeight;
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;

    if (mouseX < 0 || mouseY < 0 || mouseX > imgWidth || mouseY > imgHeight) {
        magnifier.style.display = 'none';
        return;
    }

    magnifier.style.display = 'block';

    // Dynamically calculate magnifier size as a percentage of the image
    const sizePercentage = 0.2; // 20% of the image size (adjust as needed)
    let magWidth = imgWidth * sizePercentage;
    let magHeight = imgHeight * sizePercentage;

    // Enforce minimum and maximum sizes
    const minSize = 100; // Minimum size in pixels
    const maxSize = 300; // Maximum size in pixels
    magWidth = Math.max(minSize, Math.min(maxSize, magWidth));
    magHeight = Math.max(minSize, Math.min(maxSize, magHeight));

    // Apply the calculated size to the magnifier
    magnifier.style.width = `${magWidth}px`;
    magnifier.style.height = `${magHeight}px`;

    const zoomFactor = 2;

    let magX = mouseX - magWidth / 2;
    let magY = mouseY - magHeight / 2;

    magX = Math.max(0, Math.min(magX, imgWidth - magWidth));
    magY = Math.max(0, Math.min(magY, imgHeight - magHeight));

    magnifier.style.left = `${magX}px`;
    magnifier.style.top = `${magY}px`;

    const bgX = -((mouseX / imgWidth) * (imgWidth * zoomFactor) - magWidth / 2);
    const bgY = -((mouseY / imgHeight) * (imgHeight * zoomFactor) - magHeight / 2);
    magnifier.style.backgroundImage = `url('${modalImg.src}')`;
    magnifier.style.backgroundPosition = `${bgX}px ${bgY}px`;
    magnifier.style.backgroundSize = `${imgWidth * zoomFactor}px ${imgHeight * zoomFactor}px`;
}

    // Mouse Events
    imageWrapper.addEventListener('mousemove', (e) => {
        updateMagnifier(e, e.clientX, e.clientY);
    });

    imageWrapper.addEventListener('mouseleave', () => {
        magnifier.style.display = 'none';
    });

    // Touch Events
    imageWrapper.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        updateMagnifier(e, touch.clientX, touch.clientY);
    });

    imageWrapper.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        updateMagnifier(e, touch.clientX, touch.clientY);
    });

    imageWrapper.addEventListener('touchend', () => {
        magnifier.style.display = 'none';
    });

    modal.querySelector('.close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

function setupFilters(fabricsWithImages) {
    const searchInput = document.getElementById('searchInput');
    const rollWidthFilter = document.getElementById('rollWidthFilter');
    const resetFilters = document.getElementById('resetFilters');

    const filterControls = document.getElementById('filterControls');
    const filters = [
        { id: 'typeFilter', label: 'Type', key: 'Type' },
        { id: 'familyFilter', label: 'Family', key: 'Family' },
        { id: 'colourFilter', label: 'Colour', key: 'Colour' },
        { id: 'bandWidthFilter', label: 'Band Width', key: 'Band Width' },
        { id: 'scheduleFilter', label: 'Schedule', key: 'Schedule' },
        { id: 'statusFilter', label: 'Status', key: 'Status' }
    ];

    const filterValues = {};
    filters.forEach(f => {
        if (f.key === 'Band Width') {
            filterValues[f.id] = [...new Set(fabricsWithImages
                .map(fabric => fabric[f.key])
                .filter(v => v !== '' && !isNaN(v)))]
                .sort((a, b) => a - b);
        } else {
            filterValues[f.id] = [...new Set(fabricsWithImages.map(fabric => String(fabric[f.key] || '')))].filter(Boolean);
        }
    });

    filters.forEach(filter => {
        const wrapper = document.createElement('div');
        wrapper.className = 'filter-wrapper';

        const label = document.createElement('label');
        label.textContent = filter.label;
        label.setAttribute('for', filter.id);

        const multiSelect = document.createElement('div');
        multiSelect.className = 'multi-select';
        multiSelect.id = filter.id;

        const toggle = document.createElement('button');
        toggle.className = 'multi-select-toggle';
        toggle.textContent = `Select ${filter.label}`;
        toggle.type = 'button';

        const options = document.createElement('div');
        options.className = 'multi-select-options';

        const tags = document.createElement('div');
        tags.className = 'selected-tags';

        filterValues[filter.id].forEach(value => {
            const option = document.createElement('div');
            option.className = 'multi-select-option';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = value;
            checkbox.id = `${filter.id}-${String(value).replace(/\s+/g, '-')}`;
            checkbox.style.display = 'none';

            const optionLabel = document.createElement('label');
            optionLabel.textContent = value;
            optionLabel.setAttribute('for', checkbox.id);
            optionLabel.style.cursor = 'pointer';

            option.appendChild(checkbox);
            option.appendChild(optionLabel);
            options.appendChild(option);
        });

        multiSelect.appendChild(toggle);
        multiSelect.appendChild(options);
        multiSelect.appendChild(tags);
        wrapper.appendChild(label);
        wrapper.appendChild(multiSelect);

        filterControls.insertBefore(wrapper, rollWidthFilter.parentNode);
    });

    function filterFabrics() {
        const searchTerm = searchInput.value.toLowerCase();
        const rollWidthValue = parseFloat(rollWidthFilter.value) || 0;

        const selectedValues = {};
        filters.forEach(filter => {
            selectedValues[filter.key] = Array.from(
                document.querySelectorAll(`#${filter.id} .multi-select-option input:checked`)
            ).map(input => filter.key === 'Band Width' ? parseFloat(input.value) : input.value);
        });

        const filtered = fabricsWithImages.filter(fabric => {
            const rollWidthNum = parseFloat(fabric["Roll Width"]) || 0;
            const bandWidthValue = fabric["Band Width"];
            const nameMatch = fabric.Name.toLowerCase().includes(searchTerm) || fabric.SKU.toLowerCase().includes(searchTerm);

            return (
                nameMatch &&
                (selectedValues["Type"].length === 0 || selectedValues["Type"].includes(fabric.Type)) &&
                (selectedValues["Family"].length === 0 || selectedValues["Family"].includes(fabric.Family)) &&
                (selectedValues["Colour"].length === 0 || selectedValues["Colour"].includes(fabric.Colour)) &&
                (selectedValues["Band Width"].length === 0 || selectedValues["Band Width"].includes(bandWidthValue)) &&
                (rollWidthValue === 0 || rollWidthNum >= rollWidthValue) &&
                (selectedValues["Schedule"].length === 0 || selectedValues["Schedule"].includes(fabric.Schedule)) &&
                (selectedValues["Status"].length === 0 || selectedValues["Status"].includes(fabric.Status))
            );
        });

        displayFabrics(filtered, true);
    }

    function resetAllFilters() {
        searchInput.value = '';
        rollWidthFilter.value = '';
        filters.forEach(filter => {
            const checkboxes = document.querySelectorAll(`#${filter.id} .multi-select-option input`);
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
            const tags = document.querySelector(`#${filter.id} .selected-tags`);
            tags.innerHTML = '';
            const toggle = document.querySelector(`#${filter.id} .multi-select-toggle`);
            toggle.textContent = `Select ${filter.label}`;
        });
        filterFabrics();
    }

    const debouncedFilterFabrics = debounce(filterFabrics, 300);

    searchInput.addEventListener('input', debouncedFilterFabrics);
    rollWidthFilter.addEventListener('input', debouncedFilterFabrics);
    resetFilters.addEventListener('click', resetAllFilters);

    filters.forEach(filter => {
        const multiSelect = document.getElementById(filter.id);
        const toggle = multiSelect.querySelector('.multi-select-toggle');
        const options = multiSelect.querySelector('.multi-select-options');
        const tags = multiSelect.querySelector('.selected-tags');

        toggle.addEventListener('click', () => {
            multiSelect.classList.toggle('open');
        });

        options.addEventListener('click', (e) => {
            const option = e.target.closest('.multi-select-option');
            if (!option) return;

            const checkbox = option.querySelector('input[type="checkbox"]');
            const label = option.querySelector('label');
            if (e.target === label || option.contains(e.target)) {
                checkbox.checked = !checkbox.checked;

                const value = checkbox.value;
                const isChecked = checkbox.checked;
                const existingTag = Array.from(tags.children).find(t => t.dataset.value === value);

                if (isChecked && !existingTag) {
                    const tag = document.createElement('span');
                    tag.className = 'selected-tag';
                    tag.dataset.value = value;
                    tag.textContent = `${value} ×`;
                    tag.addEventListener('click', () => {
                        checkbox.checked = false;
                        tag.remove();
                        updateToggleText(filter.id, filter.label);
                        filterFabrics();
                    });
                    tags.appendChild(tag);
                } else if (!isChecked && existingTag) {
                    existingTag.remove();
                }

                updateToggleText(filter.id, filter.label);
                filterFabrics();
            }
        });

        document.addEventListener('click', (e) => {
            if (!multiSelect.contains(e.target)) {
                multiSelect.classList.remove('open');
            }
        });
    });

    function updateToggleText(filterId, label) {
        const selected = Array.from(document.querySelectorAll(`#${filterId} .multi-select-option input:checked`));
        const toggle = document.querySelector(`#${filterId} .multi-select-toggle`);
        toggle.textContent = selected.length > 0 ? `${selected.length} ${label} selected` : `Select ${filter.label}`;
    }
}

function setupFilterButton() {
    const filterBtn = document.getElementById('filterBtn');
    const filterControls = document.getElementById('filterControls');
    let isFilterVisible = false;
    const headerHeight = document.querySelector('h1').offsetHeight;
    const BUFFER_ZONE = 200;

    function updateFilterVisibility() {
        const scrollPosition = window.scrollY;

        if (scrollPosition > headerHeight + BUFFER_ZONE) {
            filterBtn.classList.remove('hidden');
            if (!isFilterVisible) {
                filterControls.classList.add('hidden');
            }
        } else {
            filterBtn.classList.add('hidden');
            filterControls.classList.remove('hidden');
            filterControls.style.position = 'sticky';
            filterControls.style.top = '0';
            filterControls.style.left = 'auto';
            filterControls.style.transform = 'translateX(0)';
            filterControls.style.width = 'auto';
            filterControls.style.maxWidth = '1400px';
            filterControls.style.zIndex = '1000';
            isFilterVisible = false;
            filterBtn.classList.remove('active');
        }
    }

    const debouncedScrollHandler = debounce(updateFilterVisibility, 100);
    window.addEventListener('scroll', debouncedScrollHandler);

    filterBtn.addEventListener('click', () => {
        isFilterVisible = !isFilterVisible;

        if (isFilterVisible) {
            filterControls.classList.remove('hidden');
            filterControls.style.position = 'fixed';
            filterControls.style.top = '1rem';
            filterControls.style.left = '50%';
            filterControls.style.transform = 'translateX(-50%)';
            filterControls.style.width = 'calc(100% - 2rem)';
            filterControls.style.maxWidth = '1400px';
            filterControls.style.zIndex = '1001';
            filterBtn.classList.add('active');
        } else {
            filterControls.classList.add('hidden');
            filterControls.style.position = 'sticky';
            filterControls.style.top = '0';
            filterControls.style.left = 'auto';
            filterControls.style.transform = 'translateX(0)';
            filterControls.style.width = 'auto';
            filterBtn.classList.remove('active');
        }
    });

    filterBtn.classList.add('hidden');
    updateFilterVisibility();
}

fetchFabrics();
