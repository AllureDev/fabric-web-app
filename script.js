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

        // Parse Google Sheets JSON response
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

// The rest of the functions (displayFabrics, showFabricDetails, setupFilters, setupFilterButton) remain unchanged
function displayFabrics(fabrics) {
    const grid = document.getElementById('fabricGrid');
    grid.innerHTML = '';

    if (fabrics.length === 0) {
        grid.innerHTML = '<p>No matching fabrics found.</p>';
        return;
    }

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('placeholder');
                observer.unobserve(img);
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

        const img = document.createElement('img');
        img.src = PLACEHOLDER_IMAGE;
        img.dataset.src = fabric.imageLink;
        img.alt = fabric.Name || 'Fabric';
        img.className = 'placeholder';

        img.onerror = function() {
            console.error('Image failed to load:', this.dataset.src);
            this.src = PLACEHOLDER_IMAGE;
            card.remove();
        };

        const nameP = document.createElement('p');
        nameP.innerHTML = `<strong>${fabric.Name || 'Unnamed Fabric'}</strong>`;

        card.appendChild(img);
        card.appendChild(nameP);

        card.addEventListener('click', () => showFabricDetails(fabric));

        grid.appendChild(card);
        observer.observe(img);
    });
}

function showFabricDetails(fabric) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">×</span>
            <img src="${PLACEHOLDER_IMAGE}" data-src="${fabric.imageLink}" alt="${fabric.Name}" style="max-width:100%;">
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
    modalImg.src = modalImg.dataset.src;

    modalImg.onerror = function() {
        console.error('Full image failed to load:', this.dataset.src);
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

            const optionLabel = document.createElement('label');
            optionLabel.textContent = value;
            optionLabel.setAttribute('for', checkbox.id);

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

        displayFabrics(filtered);
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
            const checkbox = e.target.closest('input[type="checkbox"]');
            if (!checkbox) return;

            const value = checkbox.value;
            const isChecked = checkbox.checked;

            if (isChecked) {
                const tag = document.createElement('span');
                tag.className = 'selected-tag';
                tag.textContent = value;
                const remove = document.createElement('span');
                remove.className = 'remove-tag';
                remove.textContent = '×';
                remove.addEventListener('click', () => {
                    checkbox.checked = false;
                    tag.remove();
                    updateToggleText(filter.id, filter.label);
                    filterFabrics();
                });
                tag.appendChild(remove);
                tags.appendChild(tag);
            } else {
                const tag = Array.from(tags.children).find(t => t.textContent.startsWith(value));
                if (tag) tag.remove();
            }

            updateToggleText(filter.id, filter.label);
            filterFabrics();
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
        toggle.textContent = selected.length > 0 ? `${selected.length} ${label} selected` : `Select ${label}`;
    }
}

function setupFilterButton() {
    const filterBtn = document.getElementById('filterBtn');
    const filterControls = document.getElementById('filterControls');
    let isHidden = false;
    let lastShownPosition = 0;
    const BUFFER_ZONE = 200;

    const debouncedScrollHandler = debounce(() => {
        const scrollPosition = window.scrollY;
        const headerHeight = document.querySelector('h1').offsetHeight;
        const controlsHeight = filterControls.offsetHeight;

        if (!isHidden && scrollPosition > (headerHeight + controlsHeight)) {
            filterControls.classList.add('hidden');
            filterBtn.style.display = 'flex';
            isHidden = true;
        } else if (isHidden && scrollPosition <= headerHeight) {
            filterControls.classList.remove('hidden');
            filterControls.style.position = 'sticky';
            filterControls.style.top = '0';
            filterControls.style.opacity = '1';
            filterBtn.style.display = 'none';
            isHidden = false;
        } else if (!isHidden && Math.abs(scrollPosition - lastShownPosition) > BUFFER_ZONE) {
            filterControls.classList.add('hidden');
            filterBtn.style.display = 'flex';
            isHidden = true;
        }
    }, 100);

    window.addEventListener('scroll', debouncedScrollHandler);

    filterBtn.addEventListener('click', () => {
        if (isHidden) {
            const scrollPosition = window.scrollY;
            filterControls.classList.remove('hidden');
            filterControls.style.position = 'absolute';
            filterControls.style.top = `${scrollPosition + 10}px`;
            filterControls.style.left = '50%';
            filterControls.style.transform = 'translateX(-50%)';
            filterControls.style.opacity = '1';
            filterControls.style.width = 'calc(100% - 2rem)';
            filterControls.style.maxWidth = '1400px';
            filterBtn.style.display = 'none';
            isHidden = false;
            lastShownPosition = scrollPosition;
        } else {
            filterControls.classList.add('hidden');
            filterBtn.style.display = 'flex';
            isHidden = true;
        }
    });

    filterBtn.style.display = 'none';
}

fetchFabrics();
