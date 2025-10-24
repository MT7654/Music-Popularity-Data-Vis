// section2.js
d3.csv("Spotify_Data_Pre-processed.csv").then(function(data) {
    console.log("Data loaded:", data.length);

    // -------------------------------
    // Step 1: Parse and Clean
    // -------------------------------
    data.forEach(d => {
        d.album_release_date = new Date(d.album_release_date);
        d.snapshot_date = new Date(d.snapshot_date);
        d.popularity = +d.popularity;
    });

    // Remove rows with missing country or vibe category
    data = data.filter(d => d.country && d.vibe_category);

    const latestDate = d3.max(data, d => d.album_release_date);
    const fiveYearsAgo = new Date(latestDate);
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

    // Filter last 5 years only
    const filteredData = data.filter(d =>
        d.album_release_date >= fiveYearsAgo && d.album_release_date <= latestDate
    );
    console.log("Filtered data:", filteredData.length);

    const parseMonth = d => new Date(d.getFullYear(), d.getMonth(), 1);

    // -------------------------------
    // Chart 1: Global Vibe Trends (Stacked Area)
    // -------------------------------
    let vibeMonthly = d3.rollups(
        filteredData,
        v => d3.mean(v, d => d.popularity),
        d => parseMonth(d.album_release_date),
        d => d.vibe_category
    );

    const months = Array.from(new Set(vibeMonthly.map(d => +d[0]))).sort().map(d => new Date(d));
    const vibeCategories = Array.from(new Set(filteredData.map(d => d.vibe_category)));

    const traces = vibeCategories.map(vibe => {
        const series = vibeMonthly.map(monthGroup => {
            const entry = monthGroup[1].find(sub => sub[0] === vibe);
            return entry ? entry[1] : 0;
        });
        return {
            x: months,
            y: series,
            name: vibe,
            stackgroup: 'one',
            mode: 'none'
        };
    });

    Plotly.newPlot('area-chart', traces, {
        title: 'Vibe Popularity Trends (Last 5 Years)',
        xaxis: { title: 'Month' },
        yaxis: { title: 'Avg Popularity', rangemode: 'tozero' },
        hovermode: 'x unified',
        legend: { orientation: 'h', y: -0.2 }
    });

    // -------------------------------
    // Chart 2: Top 5 Countries – Avg Popularity Over Time
    // -------------------------------
    const countryPopularity = d3.rollups(
        filteredData,
        v => d3.mean(v, d => d.popularity),
        d => d.country
    ).sort((a,b) => b[1]-a[1]);

    const topCountries = countryPopularity.slice(0,5).map(d => d[0]);
    console.log("Top countries:", topCountries);

    const countryMonthly = topCountries.map(country => {
        const monthly = d3.rollups(
            filteredData.filter(d => d.country === country),
            v => d3.mean(v, d => d.popularity),
            d => parseMonth(d.album_release_date)
        ).sort((a,b) => a[0] - b[0]);
        return {
            name: country,
            x: monthly.map(d => d[0]),
            y: monthly.map(d => d[1]),
            mode: 'lines+markers',
            line: { shape: 'spline' }
        };
    });

    Plotly.newPlot('line-chart', countryMonthly, {
        title: 'Top 5 Countries – Avg Popularity Over Time',
        xaxis: { title: 'Month' },
        yaxis: { title: 'Avg Popularity' },
        hovermode: 'x'
    });

    // -------------------------------
    // Chart 3: Vibe Heatmap by Country
    // -------------------------------
    let vibeCountry = d3.rollups(
        filteredData,
        v => d3.mean(v, d => d.popularity),
        d => d.country,
        d => d.vibe_category
    );

    const top10Countries = countryPopularity.slice(0, 10).map(d => d[0]);
    const vibeList = Array.from(new Set(filteredData.map(d => d.vibe_category)));

    const z = top10Countries.map(country => {
        const entry = vibeCountry.find(d => d[0] === country);
        if (!entry) return vibeList.map(() => null);
        return vibeList.map(vibe => {
            const found = entry[1].find(sub => sub[0] === vibe);
            return found ? found[1] : null;
        });
    });

    const heatmap = {
        z: z,
        x: vibeList,
        y: top10Countries,
        type: 'heatmap',
        colorscale: 'Viridis',
        colorbar: { title: 'Avg Popularity' }
    };

    Plotly.newPlot('vibe-heatmap', [heatmap], {
        title: 'Average Popularity by Vibe and Country (Last 5 Years)',
        xaxis: { title: 'Vibe Category' },
        yaxis: { title: 'Country' },
        hovermode: 'closest'
    });
});
