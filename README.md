# Diagram MCP Server

A Model Context Protocol (MCP) server that renders Mermaid diagrams and Plotly charts, converting them to various image formats.

## Features

- **Mermaid Diagram Rendering**: Convert Mermaid code to SVG, PNG, or PDF
- **Plotly Chart Rendering**: Convert Plotly charts to SVG, PNG, or PDF
- **Image Conversion**: Convert diagrams and charts to PNG, JPG, or PDF with customizable quality
- **Multiple Themes**: Support for default, dark, and forest themes (Mermaid)
- **Customizable Output**: Control dimensions, background colors, and quality settings
- **TypeScript**: Fully typed with Zod validation

## Installation

### Local Installation

```bash
pnpm install
```

### Docker Installation

```bash
# Build and run with Docker Compose (recommended)
docker-compose up -d

# Or build and run manually
docker build -t diagram-mcp .
docker run -p 3000:3000 diagram-mcp
```

## Development

```bash
# Start development server
pnpm run dev

# Build the project
pnpm run build

# Run tests
pnpm test

# Run tests with coverage
pnpm run test:coverage

# Docker commands
pnpm run docker:build    # Build Docker image
pnpm run docker:run      # Run Docker container
pnpm run docker:compose  # Start with Docker Compose
```

## Usage

### Available Tools

#### 1. `render_mermaid`

Renders a Mermaid diagram to SVG, PNG, or PDF format.

**Parameters:**

- `mermaidCode` (string, required): The Mermaid diagram code
- `format` (string, optional): Output format - 'svg', 'png', or 'pdf' (default: 'svg')
- `theme` (string, optional): Theme - 'default', 'dark', or 'forest' (default: 'default')
- `backgroundColor` (string, optional): Background color (default: '#ffffff')
- `width` (number, optional): Custom width in pixels
- `height` (number, optional): Custom height in pixels

**Example:**

```json
{
  "mermaidCode": "graph TD\n  A[Start] --> B[End]",
  "format": "svg",
  "theme": "default"
}
```

#### 2. `render_plotly`

Renders a Plotly chart to SVG, PNG, or PDF format.

**Parameters:**

- `plotlyCode` (string, required): The Plotly chart code (JavaScript)
- `format` (string, optional): Output format - 'svg', 'png', or 'pdf' (default: 'svg')
- `backgroundColor` (string, optional): Background color (default: '#ffffff')
- `width` (number, optional): Custom width in pixels
- `height` (number, optional): Custom height in pixels
- `responsive` (boolean, optional): Make chart responsive (default: true)
- `displayModeBar` (boolean, optional): Show mode bar (default: false)
- `displaylogo` (boolean, optional): Show Plotly logo (default: false)

**Example:**

```json
{
  "plotlyCode": "Plotly.newPlot('plotly-chart', [{ x: [1,2,3], y: [1,2,4], type: 'scatter' }], { margin: { t: 0 } });",
  "format": "png",
  "width": 800,
  "height": 600
}
```

#### 3. `convert_to_image`

Converts a Mermaid diagram to PNG, JPG, or PDF image format.

**Parameters:**

- `mermaidCode` (string, required): The Mermaid diagram code
- `format` (string, optional): Output format - 'png', 'jpg', or 'pdf' (default: 'png')
- `theme` (string, optional): Theme - 'default', 'dark', or 'forest' (default: 'default')
- `backgroundColor` (string, optional): Background color (default: '#ffffff')
- `width` (number, optional): Custom width in pixels
- `height` (number, optional): Custom height in pixels
- `quality` (number, optional): Image quality 1-100 (default: 90)

**Example:**

```json
{
  "mermaidCode": "graph LR\n  A[Input] --> B[Process] --> C[Output]",
  "format": "png",
  "theme": "dark",
  "quality": 95
}
```

## MCP Configuration

Add this to your MCP client configuration:

```json
{
  "mcpServers": {
    "diagram-mcp": {
      "command": "node",
      "args": ["dist/index.js"],
      "env": {}
    }
  }
}
```

## Supported Chart Types

### Mermaid Diagrams

The server supports all Mermaid diagram types:

- Flowcharts
- Sequence diagrams
- Class diagrams
- State diagrams
- Entity Relationship diagrams
- User Journey diagrams
- Gantt charts
- Pie charts
- Git graphs
- C4 diagrams
- Mindmaps

### Plotly Charts

The server supports all Plotly chart types:

- Scatter plots
- Line charts
- Bar charts
- Histograms
- Box plots
- Violin plots
- Heatmaps
- 3D plots
- Contour plots
- Surface plots
- And many more...

## Examples

### Mermaid Flowchart

```mermaid
graph TD
  A[Start] --> B{Is it working?}
  B -->|Yes| C[Great!]
  B -->|No| D[Debug]
  D --> B
```

### Mermaid Sequence Diagram

```mermaid
sequenceDiagram
  participant Alice
  participant Bob
  Alice->>John: Hello John, how are you?
  loop Healthcheck
    John->>John: Fight against hypochondria
  end
  Note right of John: Rational thoughts <br/>prevail!
  John-->>Alice: Great!
  John->>Bob: How about you?
  Bob-->>John: Jolly good!
```

### Plotly Scatter Plot

```javascript
Plotly.newPlot(
  "plotly-chart",
  [
    {
      x: [1, 2, 3, 4, 5],
      y: [1, 2, 4, 8, 16],
      type: "scatter",
      mode: "lines+markers",
    },
  ],
  {
    title: "Exponential Growth",
    xaxis: { title: "X" },
    yaxis: { title: "Y" },
  }
);
```

## Error Handling

The server provides detailed error messages for:

- Invalid Mermaid syntax
- Unsupported formats
- Browser initialization failures
- Screenshot generation errors

## Dependencies

- `@modelcontextprotocol/sdk`: MCP SDK
- `mermaid`: Mermaid diagram rendering
- `puppeteer`: Browser automation for image conversion
- `zod`: Schema validation
- `dotenv`: Environment variable management

## License

MIT
