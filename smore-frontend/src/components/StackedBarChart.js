import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import axios from 'axios';

const StackedBarChart = () => {
  const chartRef = useRef();
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const userId = localStorage.getItem('userId');
      const token = localStorage.getItem('jwtToken');

      try {
        const response = await axios.get(`/api/v1/users/${userId}/workSessions`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setData(processData(response.data.work_sessions));
      } catch (error) {
        console.error('Error fetching work sessions data:', error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (data.length > 0) {
      createStackedBarChart(data);
    }
  }, [data]);

  const processData = (sessions) => {
    const dates = [...new Set(sessions.map(session => session.date))];
    const projects = [...new Set(sessions.map(session => session.project_name))];

    // Map to hold all data with durations, including 0s for missing entries
    const result = dates.flatMap(date => {
      return projects.map(project => {
        const session = sessions.find(s =>
          s.date === date && s.project_name === project
        );

        return {
          date,
          project,
          duration: session ? Number(session.total_duration) : 0
        };
      });
    });

    return result;
  };

  const createStackedBarChart = (data) => {
    // Set chart dimensions and margins
    const width = 928;
    const height = 500;
    const margin = { top: 20, bottom: 30, left: 40, right: 20 };
  
    // Stack the data by project for each date
    const series = d3.stack()
      .keys(d3.union(data.map(d => d.project))) // distinct series keys, in input order 
      .value(([, D], key) => D.get(key).duration || 0) // get value for each series key and stack
      (d3.index(data, d => d.date, d => d.project)); // group by stack then series key

    const x = d3.scaleBand()
      .domain([...new Set(data.map(d => d.date))].sort((a, b) => new Date(a) - new Date(b))) // unique dates in ascending order
      .range([margin.left, width - margin.right])
      .padding(0.1);

    const y = d3.scaleLinear()
      .domain([0, d3.max(series, d => d3.max(d, d => d[1]))])
      .rangeRound([height - margin.bottom, margin.top]);
  
    // Color scale for each project
    const colors = ["#d10000", "#ff6622", "#ffda21", "#33dd00", "#1133cc", "#220066", "#330044"];
    const color = d3.scaleOrdinal()
      .domain(series.map(d => d.key))
      .range(colors);
  
    // Function to format the value in the tooltip 
    const formatValue = x => isNaN(x) ? "N/A" : x.toLocaleString("en");
 
    // Assign svg to chartRef
    d3.select(chartRef.current).selectAll("*").remove();
    const svg = d3.select(chartRef.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto;");
  
    // Add groups for each series and rects for each element within each series
    svg.append("g")
      .selectAll("g")
      .data(series)
      .join("g")
        .attr("fill", d => color(d.key))
      .selectAll("rect")
      .data(D => D.map(d => (d.key = D.key, d))) // map project names to rectangles
      .join("rect")
        .attr("x", d => x(d.data[0])) // x position based on date
        .attr("y", d => y(d[1])) // y position for the top of the stack
        .attr("height", d => y(d[0]) - y(d[1])) // height based on duration
        .attr("width", x.bandwidth()) // width based on x scale
      .append("title")
        .text(d => `${d.data[0]} ${d.key}\n${formatValue(d.data[1].get(d.key).duration)}`);
  
    // Add x-axis
    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).tickSizeOuter(0))
      .call(g => g.selectAll(".domain").remove());
  
    // Add y-axis
    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(null, "s"))
      .call(g => g.selectAll(".domain").remove());

  };

  return <div ref={chartRef}></div>;
};

export default StackedBarChart;
