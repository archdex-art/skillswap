const skillsDictionary = {
  "JavaScript": ["js", "javascript"],
  "Machine Learning": ["ml", "machine learning", "ai", "artificial intelligence", "deep learning", "deeplearning"],
  "React": ["reactjs", "react.js", "react"],
  "Node.js": ["nodejs", "node", "node.js"],
  "Python": ["python3", "python", "py"],
  "C++": ["cpp", "c++", "c plus plus"],
  "Frontend Development": ["frontend", "front-end", "front end", "ui", "ux", "ui/ux"],
  "Backend Development": ["backend", "back-end", "back end", "api", "databases"],
  "Fullstack Development": ["fullstack", "full-stack", "mern", "mean"],
  "Data Science": ["data science", "data analysis", "pandas", "numpy"],
  "HTML": ["html", "html5"],
  "CSS": ["css", "css3", "tailwind", "bootstrap"]
};

// Also export a normalized graph for suggestions if needed, but primary is the dictionary above.
const skillGraph = {
  "JavaScript": ["React", "Node.js", "Frontend Development"],
  "React": ["JavaScript", "Frontend Development"],
  "Node.js": ["JavaScript", "Backend Development"],
  "Machine Learning": ["Data Science", "Python"],
  "Python": ["Data Science", "Machine Learning", "Backend Development"],
  "Frontend Development": ["React", "JavaScript", "HTML", "CSS"],
  "Backend Development": ["Node.js", "Python"],
};

module.exports = {
  skillsDictionary,
  skillGraph
};
