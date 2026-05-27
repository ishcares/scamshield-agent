const { spawn } = require('child_process');
const mongoose = require('mongoose');

class MongodbMcpClient {
  constructor() {
    this.process = null;
    this.requestId = 1;
    this.pendingRequests = new Map();
    this.buffer = '';
    this.isConnected = false;
  }

  /**
   * Initialize and connect to the official mongodb-mcp-server via stdio.
   */
  async connect() {
    if (this.isConnected) return true;

    try {
      const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/scamshield';
      console.log('[MCPClient] Spawning mongodb-mcp-server child process...');

      // Spawn npx mongodb-mcp-server with the MongoDB connection URI
      this.process = spawn('npx', ['-y', 'mongodb-mcp-server', `--mongodb-uri=${uri}`], {
        env: { ...process.env, PATH: process.env.PATH },
        shell: true
      });

      this.process.stdout.on('data', (data) => {
        this.buffer += data.toString();
        this.handleIncomingData();
      });

      this.process.stderr.on('data', (data) => {
        // Log stderr as warnings (since MCP servers might output debugging info there)
        const log = data.toString().trim();
        if (log && !log.includes('ExperimentalWarning')) {
          console.warn(`[MCPServer Stderr]: ${log}`);
        }
      });

      this.process.on('close', (code) => {
        console.warn(`[MCPClient] Child process exited with code ${code}`);
        this.isConnected = false;
        this.process = null;
      });

      this.process.on('error', (err) => {
        console.error('[MCPClient] Spawn error:', err.message);
        this.isConnected = false;
      });

      // Wait a short time to verify process booted without instant crash
      await new Promise((resolve) => setTimeout(resolve, 2500));
      this.isConnected = true;
      console.log('[MCPClient] Connected successfully to mongodb-mcp-server.');
      return true;
    } catch (err) {
      console.error('[MCPClient] Failed to boot MCP server:', err.message);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Handle incoming raw stdout data, splitting by newlines and parsing JSON-RPC responses.
   */
  handleIncomingData() {
    let newlineIndex;
    while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, newlineIndex).trim();
      this.buffer = this.buffer.slice(newlineIndex + 1);

      if (!line) continue;

      try {
        const message = JSON.parse(line);
        if (message.id !== undefined) {
          const handler = this.pendingRequests.get(message.id);
          if (handler) {
            this.pendingRequests.delete(message.id);
            if (message.error) {
              handler.reject(new Error(message.error.message || 'JSON-RPC Error'));
            } else {
              handler.resolve(message.result);
            }
          }
        }
      } catch (err) {
        // Skip unparseable lines (e.g. startup logs printed to stdout)
        console.log(`[MCPClient SkipLine]: ${line.substring(0, 100)}`);
      }
    }
  }

  /**
   * Call an MCP tool using standard JSON-RPC 2.0 message syntax.
   */
  async callTool(toolName, args) {
    if (!this.isConnected || !this.process) {
      const ok = await this.connect();
      if (!ok) throw new Error('MCP server is offline');
    }

    const id = this.requestId++;
    const request = {
      jsonrpc: '2.0',
      id,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      // Set timeout to prevent hanging forever
      const timer = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`MCP Tool Call Timeout (${toolName})`));
        }
      }, 15000);

      this.process.stdin.write(JSON.stringify(request) + '\n', (err) => {
        if (err) {
          clearTimeout(timer);
          this.pendingRequests.delete(id);
          reject(err);
        }
      });
    }).then((res) => {
      // Return the tool's output text parsed back to JSON if it has structured text
      if (res && res.content && res.content[0]) {
        try {
          return JSON.parse(res.content[0].text);
        } catch {
          return res.content[0].text;
        }
      }
      return res;
    });
  }

  /**
   * Run a query using the official find tool.
   */
  async mcpFind(collection, filter = {}, limit = 10) {
    const db = mongoose.connection.name || 'scamshield';
    console.log(`[MCPClient] Running find on collection: ${collection}`);
    const res = await this.callTool('find', { db, collection, filter, limit });
    return res;
  }

  /**
   * Run an aggregation using the official aggregate tool.
   */
  async mcpAggregate(collection, pipeline = []) {
    const db = mongoose.connection.name || 'scamshield';
    console.log(`[MCPClient] Running aggregate on collection: ${collection}`);
    const res = await this.callTool('aggregate', { db, collection, pipeline });
    return res;
  }

  /**
   * Insert documents using the official insert-many tool.
   */
  async mcpInsert(collection, documents = []) {
    const db = mongoose.connection.name || 'scamshield';
    console.log(`[MCPClient] Running insert-many on collection: ${collection}`);
    const res = await this.callTool('insert-many', { db, collection, documents });
    return res;
  }
}

// Export single shared client instance
const mcpClient = new MongodbMcpClient();
module.exports = mcpClient;
