import React, { useEffect, useState } from 'react';
import axios from 'axios';
import * as d3 from 'd3';

const WorkSessionsChart = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('jwtToken');
      const user = localStorage.getItem('user');
      const userId = user.id;

      try {
        const response = await axios.get(`http://localhost:3005/api/v1/users/${userId}/workSessions`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setData(response.data.work_sessions);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (data.length > 0) {
      createChart(data);
    }
  }, [data]);

  const createChart = (data) => {
    const svg = d3.select('#chart');
    svg.selectAll('*').remove(); // Clear previous chart

    const margin = { top: 20, right: 30, bottom: 40, left: 90 },
      width = 800 - margin.left - margin.right,
      height = 400 - margin.top - margin.bottom;

    const x = d3.scaleBand()
      .range([0, width])
      .padding(0.1)
      .domain(data.map(d => d.project_name));

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.total_duration)])
      .nice()
      .range([height, 0]);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    g.append('g')
      .attr('class', 'axis axis--x')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x));

    g.append('g')
      .attr('class', 'axis axis--y')
      .call(d3.axisLeft(y).ticks(10))
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 6)
      .attr('dy', '0.71em')
      .attr('text-anchor', 'end')
      .text('Total Duration in Minutes');

    g.selectAll('.bar')
      .data(data)
      .enter().append('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d.project_name))
      .attr('y', d => y(d.total_duration))
      .attr('width', x.bandwidth())
      .attr('height', d => height - y(d.total_duration))
      .attr('fill', 'steelblue');
  };

  return (
    <div>
      <svg id="chart" width={800} height={400}></svg>
    </div>
  );
};

export default WorkSessionsChart
