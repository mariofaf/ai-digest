document.addEventListener("DOMContentLoaded", function () {
    const url = "https://ai-digest-api.onrender.com/api/data"; // Your deployed backend URL
    let showGlobalGrandMaVersion = false; // Global toggle state
    const ITEMS_PER_PAGE = 6; // Number of items to show per page
    let currentPage = 1;
    let allData = []; // Store all fetched data
    let filteredData = []; // Filtered data for search
    let cardGrandMaState = {}; // Track individual card states

    const cardContainer = document.getElementById("card-container");
    const toggleButton = document.getElementById("toggle-version-btn");
    const darkModeToggle = document.getElementById("dark-mode-toggle");
    const searchInput = document.getElementById("search-input");
    const clearSearchButton = document.getElementById("clear-search");

    // Display current date in header
    const today = new Date();
    const dateElement = document.getElementById("date");
    if (dateElement) {
        dateElement.textContent = today.toLocaleDateString();
    }

    // Show loading skeletons
    function showLoadingState() {
        cardContainer.innerHTML = "";
        
        // Create skeleton cards
        for (let i = 0; i < 6; i++) {
            const skeletonCard = document.createElement("div");
            skeletonCard.classList.add("card", "skeleton-card");
            skeletonCard.innerHTML = `
                <div class="skeleton-img"></div>
                <div class="skeleton-title"></div>
                <div class="skeleton-date"></div>
                <div class="skeleton-content"></div>
                <div class="skeleton-buttons"></div>
            `;
            cardContainer.appendChild(skeletonCard);
        }
    }

    // Sort data by date (newest to oldest)
    function sortDataByDate(data) {
        return [...data].sort((a, b) => {
            const dateA = new Date(a.fields.Date);
            const dateB = new Date(b.fields.Date);
            return dateB - dateA; // For newest to oldest
        });
    }

    // Lazy load images
    function lazyLoadImages() {
        const images = document.querySelectorAll('.card img');
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    const src = img.dataset.src;
                    if (src) {
                        img.src = src;
                        img.removeAttribute('data-src');
                    }
                    observer.unobserve(img);
                }
            });
        }, {
            rootMargin: "50px"
        });

        images.forEach(img => {
            imageObserver.observe(img);
        });
    }

    // Generate news text (GrandMa or Original)
    function getNewsText(fields, isGrandMaVersion, cardId) {
        if (isGrandMaVersion) {
            if (fields["GrandMa Text"]) {
                let granMaSentences = fields["GrandMa Text"].split(". ");
                let summary = `<p><strong>📌 Resumen:</strong> ${granMaSentences[0]}.</p>`;
                let ideas = "<div class='key-ideas'>💡 Ideas Clave:</div><ul>";

                granMaSentences.slice(1).forEach(sentence => {
                    if (sentence.trim()) {
                        ideas += `<li>${sentence}.</li>`;
                    }
                });

                ideas += "</ul>";
                return `<div class="grandma-text">${summary + ideas}</div>`;
            } else {
                return "<p>📌 No hay versión GrandMa disponible.</p>";
            }
        } else {
            let paragraphs = fields["Original Text"] ? fields["Original Text"].split("\n") : [];
            return `<div class="original-text">${paragraphs.map(p => `<p><strong>📝 Idea clave:</strong> ${p}</p>`).join("")}</div>`;
        }
    }

    // Toggle individual card version
    function toggleCardVersion(cardId) {
        const card = document.getElementById(cardId);
        if (!card) return;

        // Toggle this specific card's state
        cardGrandMaState[cardId] = !cardGrandMaState[cardId];
        const isGrandMaVersion = cardGrandMaState[cardId];
        
        // Update button text
        const toggleBtn = card.querySelector('.card-version-toggle');
        if (toggleBtn) {
            toggleBtn.textContent = isGrandMaVersion ? '📄 View Original' : '👵 View GrandMa Version';
            toggleBtn.classList.toggle('grandma-active', isGrandMaVersion);
        }
        
        // Update content
        const contentContainer = card.querySelector('.content-container');
        const record = allData.find(r => r.id === cardId) || filteredData.find(r => r.id === cardId);
        
        if (record && contentContainer) {
            contentContainer.innerHTML = getNewsText(record.fields, isGrandMaVersion, cardId);
        }
    }

    // Search functionality
    function performSearch() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        
        if (searchTerm) {
            filteredData = allData.filter(record => {
                const fields = record.fields;
                const titleMatch = (fields["Title"] || "").toLowerCase().includes(searchTerm);
                const textMatch = (fields["GrandMa Text"] || "").toLowerCase().includes(searchTerm) || 
                                 (fields["Original Text"] || "").toLowerCase().includes(searchTerm);
                
                return titleMatch || textMatch;
            });
            
            // Show/hide clear button
            clearSearchButton.style.display = 'block';
        } else {
            filteredData = allData;
            clearSearchButton.style.display = 'none';
        }

        currentPage = 1;
        renderPaginatedData();
    }

    // Voting system
    function initializeVoting() {
        cardContainer.addEventListener('click', function(event) {
            const voteButton = event.target.closest('.vote-btn');
            if (voteButton) {
                const card = voteButton.closest('.card');
                const voteCountElement = card.querySelector('.vote-count');
                
                if (!card.dataset.voted) {
                    let currentVotes = parseInt(voteCountElement.textContent) || 0;
                    voteCountElement.textContent = currentVotes + 1;
                    card.dataset.voted = 'true';
                    voteButton.style.opacity = '0.5';
                    
                    // In a real app, you'd send this to your backend
                    console.log('Vote registered for article');
                }
            }
        });
    }

    // Social Share functionality
    function initializeSharing() {
        cardContainer.addEventListener('click', function(event) {
            const shareButton = event.target.closest('.share-btn');
            if (shareButton) {
                const card = shareButton.closest('.card');
                const title = card.querySelector('h3').textContent;
                const url = card.querySelector('.view-btn').getAttribute('onclick').replace("window.open('", "").replace("', '_blank')", "");
                
                // Try using Web Share API first (mobile friendly)
                if (navigator.share) {
                    navigator.share({
                        title: title,
                        text: `Check out this AI news: ${title}`,
                        url: url || window.location.href
                    })
                    .catch(err => {
                        console.error('Share failed:', err);
                        // Fall back to clipboard copy
                        copyToClipboard(title, shareButton);
                    });
                } else {
                    // Fall back to clipboard copy
                    copyToClipboard(title, shareButton);
                }
            }
        });
    }
    
    // Helper function for clipboard copying
    function copyToClipboard(title, button) {
        navigator.clipboard.writeText(`Check out this AI news: ${title}`)
            .then(() => {
                // Change button text temporarily
                const originalText = button.innerHTML;
                button.innerHTML = '✓ Copied!';
                
                // Restore button after 2 seconds
                setTimeout(() => {
                    button.innerHTML = originalText;
                }, 2000);
            })
            .catch(err => {
                console.error('Failed to copy:', err);
            });
    }

    // Initialize card version toggling
    function initializeCardToggles() {
        cardContainer.addEventListener('click', function(event) {
            const toggleButton = event.target.closest('.card-version-toggle');
            if (toggleButton) {
                const card = toggleButton.closest('.card');
                if (card && card.id) {
                    toggleCardVersion(card.id);
                }
            }
        });
    }

    // Pagination Function
    function renderPaginatedData() {
        cardContainer.innerHTML = "";
        const dataToRender = filteredData.length > 0 ? filteredData : allData;
        
        if (dataToRender.length === 0) {
            const noResults = document.createElement('div');
            noResults.classList.add('no-results');
            noResults.innerHTML = `
                <h3>No results found</h3>
                <p>No articles match your search criteria.</p>
                <button id="reset-search">Clear Search</button>
            `;
            cardContainer.appendChild(noResults);
            
            document.getElementById('reset-search')?.addEventListener('click', () => {
                searchInput.value = '';
                filteredData = allData;
                renderPaginatedData();
                clearSearchButton.style.display = 'none';
            });
            
            return;
        }
        
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const paginatedData = dataToRender.slice(startIndex, endIndex);

        // Add animation classes for staggered entry
        paginatedData.forEach((record, index) => {
            const fields = record.fields;
            const imageUrl = fields["Image"] || "placeholder.jpg";
            const votes = fields["Votes"] || 0;
            const cardId = record.id || `card-${index}`;

            // Initialize card state if not set (default to global state or false)
            if (cardGrandMaState[cardId] === undefined) {
                cardGrandMaState[cardId] = showGlobalGrandMaVersion;
            }

            const isGrandMaVersion = cardGrandMaState[cardId];
            const newsText = getNewsText(fields, isGrandMaVersion, cardId);

            const card = document.createElement("div");
            card.id = cardId;
            card.classList.add("card", "fade-in");
            card.style.animationDelay = `${index * 0.1}s`;
            card.innerHTML = `
                <img data-src="${imageUrl}" src="placeholder.jpg" alt="News Image" onerror="this.src='default.jpg';">
                <h3>${fields["Title"] || "Sin título"}</h3>
                <button class="card-version-toggle ${isGrandMaVersion ? 'grandma-active' : ''}">
                    ${isGrandMaVersion ? '📄 View Original' : '👵 View GrandMa Version'}
                </button>
                <p class="date">${fields["Date"] || "Fecha no disponible"}</p>
                <div class="content-container">${newsText}</div>
                <div class="card-actions">
                    <div class="card-buttons">
                        <button class="share-btn">🔗 Share</button>
                        <button class="view-btn" onclick="window.open('${fields["URL"] || "#"}', '_blank')">👁️ View</button>
                    </div>
                    <div class="vote-container">
                        <button class="vote-btn">👍 Vote</button>
                        <span class="vote-count">${votes}</span>
                    </div>
                </div>
            `;
            cardContainer.appendChild(card);
        });

        // Create pagination controls
        if (dataToRender.length > ITEMS_PER_PAGE) {
            createPaginationControls(dataToRender);
        }
        
        lazyLoadImages();
    }

    // Pagination Controls
    function createPaginationControls(dataToRender) {
        const totalPages = Math.ceil(dataToRender.length / ITEMS_PER_PAGE);
        
        const paginationContainer = document.createElement('div');
        paginationContainer.classList.add('pagination');
        
        // Previous button
        const prevButton = document.createElement('button');
        prevButton.textContent = '← Previous';
        prevButton.disabled = currentPage === 1;
        prevButton.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderPaginatedData();
                window.scrollTo(0, 0);
            }
        });

        // Next button
        const nextButton = document.createElement('button');
        nextButton.textContent = 'Next →';
        nextButton.disabled = currentPage === totalPages;
        nextButton.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderPaginatedData();
                window.scrollTo(0, 0);
            }
        });

        // Page info
        const pageInfo = document.createElement('span');
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;

        paginationContainer.appendChild(prevButton);
        paginationContainer.appendChild(pageInfo);
        paginationContainer.appendChild(nextButton);

        cardContainer.appendChild(paginationContainer);
    }

    // Main fetch function
    async function fetchData() {
        // Show loading state first
        showLoadingState();
        
        try {
            console.log("Fetching data from:", url);
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log("Data fetched successfully");
            
            if (!data.records || !data.records.length) {
                cardContainer.innerHTML = "<p class='no-data'>No hay datos disponibles.</p>";
                return;
            }
            
            // Sort the data by date (newest to oldest)
            allData = sortDataByDate(data.records);
            filteredData = allData;
            renderPaginatedData();
            initializeVoting();
            initializeSharing();
            initializeCardToggles();
            
        } catch (error) {
            console.error("❌ Error fetching data:", error);
            cardContainer.innerHTML = `
                <div class="error-container">
                    <div class="error-icon">❌</div>
                    <h3>Error al cargar los datos</h3>
                    <p>${error.message}</p>
                    <button onclick="fetchData()">Intentar de nuevo</button>
                </div>
            `;
        }
    }

    // Initialize the app
    fetchData();

    // Event Listeners
    // Global Toggle - affects all new cards but doesn't change existing ones
    toggleButton.addEventListener("click", () => {
        showGlobalGrandMaVersion = !showGlobalGrandMaVersion;
        
        // Update button text
        const btnIcon = toggleButton.querySelector('.btn-icon');
        const btnText = toggleButton.querySelector('.btn-text');
        
        if (showGlobalGrandMaVersion) {
            btnIcon.textContent = '📄';
            btnText.textContent = 'Show Original News';
        } else {
            btnIcon.textContent = '👵';
            btnText.textContent = 'Show GrandMa Version';
        }

        // Apply to all visible cards
        document.querySelectorAll('.card').forEach(card => {
            if (card.id) {
                cardGrandMaState[card.id] = showGlobalGrandMaVersion;
                
                // Update toggle button
                const toggleBtn = card.querySelector('.card-version-toggle');
                if (toggleBtn) {
                    toggleBtn.textContent = showGlobalGrandMaVersion ? '📄 View Original' : '👵 View GrandMa Version';
                    toggleBtn.classList.toggle('grandma-active', showGlobalGrandMaVersion);
                }
                
                // Update content
                const contentContainer = card.querySelector('.content-container');
                const record = allData.find(r => r.id === card.id) || filteredData.find(r => r.id === card.id);
                
                if (record && contentContainer) {
                    contentContainer.innerHTML = getNewsText(record.fields, showGlobalGrandMaVersion, card.id);
                }
            }
        });

        // Maintain current page and scroll position
        // No need to re-render entire page
    });

    // Search event listener
    searchInput?.addEventListener('input', performSearch);
    
    // Clear search button
    clearSearchButton?.addEventListener('click', () => {
        searchInput.value = '';
        filteredData = allData;
        currentPage = 1;
        renderPaginatedData();
        clearSearchButton.style.display = 'none';
    });

    // Dark Mode Toggle
    darkModeToggle.addEventListener("click", () => {
        document.body.classList.toggle("dark-mode");
        const isDark = document.body.classList.contains("dark-mode");
        localStorage.setItem("darkMode", isDark);
        darkModeToggle.textContent = isDark ? "☀️ Light Mode" : "🌙 Dark Mode";
    });

    // Load Dark Mode from Local Storage
    const savedDarkMode = localStorage.getItem("darkMode") === "true";
    if (savedDarkMode) {
        document.body.classList.add("dark-mode");
        darkModeToggle.textContent = "☀️ Light Mode";
    }
    
    // Make fetchData accessible globally (for retry button)
    window.fetchData = fetchData;
});
