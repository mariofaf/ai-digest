document.addEventListener("DOMContentLoaded", async function () {
    const url = "https://ai-digest-api.onrender.com/api/data"; // Fetch from backend
    let showGrandMaVersion = false;
    const ITEMS_PER_PAGE = 6; // Number of items to show per page
    let currentPage = 1;
    let allData = []; // Store all fetched data
    let filteredData = []; // Filtered data for search

    const cardContainer = document.getElementById("card-container");
    const toggleButton = document.getElementById("toggle-version-btn");
    const darkModeToggle = document.getElementById("dark-mode-toggle");
    const loadingElement = document.getElementById("loading");
    const searchInput = document.getElementById("search-input");
    const clearSearchButton = document.getElementById("clear-search");

    // Display current date in header
    const today = new Date();
    const dateElement = document.getElementById("date");
    if (dateElement) {
        dateElement.textContent = today.toLocaleDateString();
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

    // Search functionality
    function performSearch() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        
        if (searchTerm) {
            filteredData = allData.filter(record => {
                const fields = record.fields;
                const titleMatch = (fields["Title"] || "").toLowerCase().includes(searchTerm);
                const textMatch = (showGrandMaVersion 
                    ? (fields["GrandMa Text"] || "").toLowerCase() 
                    : (fields["Original Text"] || "").toLowerCase()
                ).includes(searchTerm);
                
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
                // Create and display "Copied" message
                const message = document.createElement('div');
                message.textContent = 'Copied to clipboard!';
                message.classList.add('copy-message');
                message.style.position = 'absolute';
                message.style.background = '#333';
                message.style.color = 'white';
                message.style.padding = '5px 10px';
                message.style.borderRadius = '5px';
                message.style.zIndex = '1000';
                
                // Position near the share button
                const rect = button.getBoundingClientRect();
                message.style.top = `${rect.bottom + window.scrollY + 5}px`;
                message.style.left = `${rect.left + window.scrollX}px`;
                
                document.body.appendChild(message);
                
                // Change button text temporarily
                const originalText = button.innerHTML;
                button.innerHTML = '✓ Copied!';
                
                // Remove message and restore button after 2 seconds
                setTimeout(() => {
                    document.body.removeChild(message);
                    button.innerHTML = originalText;
                }, 2000);
            })
            .catch(err => {
                console.error('Failed to copy:', err);
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
            
            document.getElementById('reset-search').addEventListener('click', () => {
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

        paginatedData.forEach((record) => {
            const fields = record.fields;
            const imageUrl = fields["Image"] || "default.jpg";
            const votes = fields["Votes"] || 0;

            let newsText;
            if (showGrandMaVersion) {
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
                    newsText = `<div class="grandma-text">${summary + ideas}</div>`;
                } else {
                    newsText = "<p>📌 No hay versión GrandMa disponible.</p>";
                }
            } else {
                let paragraphs = fields["Original Text"] ? fields["Original Text"].split("\n") : [];
                newsText = `<div class="original-text">${paragraphs.map(p => `<p><strong>📝 Idea clave:</strong> ${p}</p>`).join("")}</div>`;
            }

            const card = document.createElement("div");
            card.classList.add("card");
            card.innerHTML = `
                <img data-src="${imageUrl}" src="placeholder.jpg" alt="News Image" onerror="this.src='default.jpg';">
                <h3>${fields["Title"] || "Sin título"}</h3>
                <p class="date">${fields["Date"] || "Fecha no disponible"}</p>
                <div>${newsText}</div>
                <div class="card-buttons">
                    <button class="share-btn">🔗 Share</button>
                    <button class="view-btn" onclick="window.open('${fields["URL"] || "#"}', '_blank')">👁️ View</button>
                </div>
                <div class="vote-container">
                    <button class="vote-btn">👍 Vote</button>
                    <span class="vote-count">${votes}</span>
                </div>
            `;
            cardContainer.appendChild(card);
        });

        // Create pagination controls
        createPaginationControls(dataToRender);
        lazyLoadImages();
    }

    // Pagination Controls
    function createPaginationControls(dataToRender) {
        const totalPages = Math.ceil(dataToRender.length / ITEMS_PER_PAGE);
        
        if (totalPages <= 1) {
            return; // Don't show pagination if only one page
        }
        
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

    try {
        const response = await fetch(url);
        const data = await response.json();

        loadingElement.style.display = "none";

        if (!data.records || !data.records.length) {
            cardContainer.innerHTML = "<p>No hay datos disponibles.</p>";
            return;
        }

        allData = data.records;
        filteredData = allData;
        renderPaginatedData();
        initializeVoting();
        initializeSharing();

        // Toggle between GrandMa Version & Original Version
        toggleButton.addEventListener("click", () => {
            showGrandMaVersion = !showGrandMaVersion;
            
            // Update button text
            const btnIcon = toggleButton.querySelector('.btn-icon');
            const btnText = toggleButton.querySelector('.btn-text');
            
            if (showGrandMaVersion) {
                btnIcon.textContent = '📄';
                btnText.textContent = 'Show Original News';
            } else {
                btnIcon.textContent = '📜';
                btnText.textContent = 'Show GrandMa Version';
            }

            // Maintain search when toggling
            currentPage = 1;
            renderPaginatedData();
        });

        // Search event listener
        searchInput.addEventListener('input', performSearch);
        
        // Clear search button
        clearSearchButton.addEventListener('click', () => {
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

    } catch (error) {
        console.error("❌ Error fetching data:", error);
        loadingElement.textContent = "❌ Error al cargar los datos. Por favor, intente de nuevo más tarde.";
    }
});
