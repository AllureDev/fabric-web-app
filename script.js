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
                fabric[header] = cellValue?.v || '';
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
            // Set handlers before assigning src
            img.onload = () => {
                imageContainer.classList.add('loaded');
            };
            img.onerror = () => {
                console.error('Image failed to load:', img.dataset.src);
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

        // Create image container
        const imageContainer = document.createElement('div');
        imageContainer.className = 'image-container';

        // Create placeholder with shimmer effect
        const placeholder = document.createElement('div');
        placeholder.className = 'placeholder shimmer';

        // Create image element
        const img = document.createElement('img');
        img.alt = fabric.Name || 'Fabric';
        img.style.opacity = '0'; // Initially hidden with opacity

        if (isFilterUpdate) {
            // For filter updates, load image directly
            img.src = fabric.imageLink;
            img.onload = () => {
                imageContainer.classList.add('loaded');
            };
            img.onerror = () => {
                console.error('Image failed to load:', img.src);
            };
        } else {
            // For initial load, use lazy loading
            img.dataset.src = fabric.imageLink;
            observer.observe(imageContainer);
        }

        // Assemble the card
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
            <img src="${fabric.imageLink}" alt="${fabric.Name}" style="max-width:100%;">
            <h2>${fabric.Name || 'Unnamed Fabric'}</h2>
            <p><strong>SKU:</strong> ${fabric.SKU || 'N/A'}</p>
            <p><strong>Type:</strong> ${fabric.Type || 'N/A'}</p>
            <p><strong>Family:</strong> ${fabric.Family || 'N/A'}</p>
            <p><strong>Colour:</strong> ${fabric.Colour || 'N/A'}</p>
            <p><strong>Band Width:</strong> ${fabric["Band Width"] || 'N/A'}</p>
            <p><strong>Roll Width:</strong> ${fabric["Roll Width"] || 'N/A'}</p>
            <p><strong>Schedule:</strong> ${fabric.Schedule || 'N/A'}</p>
            <p><strong>Status:</strong> ${fabric.Status || 'N/A'}</p>
            <p><strong>Ordering Status:</strong> ${fabric["Ordering Status"] || 'N/A'}</p>
        </div>
    `;
    document.body.appendChild(modal);

    const modalImg = modal.querySelector('img');
    modalImg.onerror = function() {
        console.error('Full image failed to load:', this.src);
        this.src = PLACEHOLDER_IMAGE;
    };

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
        filterValues[f.id] = [...new Set(fabricsWithImages.map(fabric => String(fabric[f.key] || '')))].filter(Boolean);
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
            checkbox.id = `${filter.id}-${value.replace(/\s+/g, '-')}`;
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
            ).map(input => input.value);
        });

        const filtered = fabricsWithImages.filter(fabric => {
            const rollWidthNum = parseFloat(fabric["Roll Width"]) || 0;
            const bandWidthValue = fabric["Band Width"] ? String(fabric["Band Width"]).match(/^\d+/)?.[0] || '' : '';
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
            // Reset filter state when scrolled back to top
            filterBtn.classList.add('hidden');
            filterControls.classList.remove('hidden');
            filterControls.style.position = 'sticky';
            filterControls.style.top = '0';
            filterControls.style.left = 'auto';
            filterControls.style.transform = 'translateX(0)';
            filterControls.style.width = 'auto';
            filterControls.style.maxWidth = '1400px';
            filterControls.style.zIndex = '1000';
            isFilterVisible = false; // Reset visibility flag
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

    // Initial state
    filterBtn.classList.add('hidden');
    updateFilterVisibility();
}

fetchFabrics();
