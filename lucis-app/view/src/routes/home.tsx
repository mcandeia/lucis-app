import React from "react";
import { createRoute, type RootRoute } from "@tanstack/react-router";
import { CheckCircle, Circle, Loader, Sparkles, Trash2 } from "lucide-react";
import {
  useAIToolExecutor,
  useDeleteTodo,
  useGenerateTodoWithAI,
  useListTodos,
  useOptionalUser,
  useToggleTodo,
} from "@/lib/hooks";
import LoggedProvider from "@/components/logged-provider";
import { Button } from "@/components/ui/button";
import { UserButton } from "@/components/user-button";

function TodoList() {
  const { data: todos } = useListTodos();
  const toggleTodo = useToggleTodo();
  const deleteTodo = useDeleteTodo();

  const handleToggle = (todoId: number) => {
    toggleTodo.mutate(todoId);
  };

  const handleDelete = (e: React.MouseEvent, todoId: number) => {
    e.stopPropagation(); // Prevent triggering the toggle
    deleteTodo.mutate(todoId);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-white">Your TODOs</h2>

      {todos?.todos && todos.todos.length > 0
        ? (
          <div className="space-y-2">
            {todos.todos.slice(0, 3).map((todo: any) => (
              <div
                key={todo.id}
                className="group relative bg-slate-800 border border-slate-700 rounded-lg p-3 flex items-center gap-3 hover:bg-slate-700 transition-colors"
              >
                <button
                  onClick={() => handleToggle(todo.id)}
                  disabled={toggleTodo.isPending || deleteTodo.isPending}
                  className="flex-1 flex items-center gap-3 disabled:cursor-not-allowed text-left"
                >
                  <div className="flex-shrink-0">
                    {toggleTodo.isPending && toggleTodo.variables === todo.id
                      ? (
                        <Loader className="w-4 h-4 text-slate-400 animate-spin" />
                      )
                      : todo.completed
                      ? <CheckCircle className="w-4 h-4 text-slate-400" />
                      : <Circle className="w-4 h-4 text-slate-500" />}
                  </div>
                  <span
                    className={`flex-1 text-sm ${
                      todo.completed
                        ? "text-slate-400 line-through"
                        : "text-slate-200"
                    }`}
                  >
                    {todo.title}
                  </span>
                </button>

                {/* Delete button - only visible on hover */}
                <button
                  onClick={(e) => handleDelete(e, todo.id)}
                  disabled={deleteTodo.isPending || toggleTodo.isPending}
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-slate-600 rounded disabled:cursor-not-allowed flex-shrink-0"
                  title="Delete todo"
                >
                  {deleteTodo.isPending && deleteTodo.variables === todo.id
                    ? <Loader className="w-3 h-3 text-slate-400 animate-spin" />
                    : (
                      <Trash2 className="w-3 h-3 text-slate-400 hover:text-red-400 transition-colors" />
                    )}
                </button>
              </div>
            ))}
            {todos.todos.length > 3 && (
              <p className="text-xs text-slate-500 text-center">
                +{todos.todos.length - 3} more
              </p>
            )}
          </div>
        )
        : (
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-center">
            <p className="text-sm text-slate-400">No todos yet</p>
          </div>
        )}
    </div>
  );
}

function LoggedInContent() {
  const generateTodo = useGenerateTodoWithAI();
  const [customPrompt, setCustomPrompt] = React.useState("");
  const aiExecutor = useAIToolExecutor();
  const [aiQuery, setAiQuery] = React.useState("");

  const handleGenerateTodo = () => {
    generateTodo.mutate(customPrompt || undefined);
    setCustomPrompt(""); // Clear input after generation
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !generateTodo.isPending) {
      handleGenerateTodo();
    }
  };

  const handleAIExecute = () => {
    if (aiQuery.trim()) {
      aiExecutor.mutate(aiQuery);
    }
  };

  const handleAIKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !aiExecutor.isPending && aiQuery.trim()) {
      handleAIExecute();
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-medium text-slate-400">
        This content only shows up for authenticated users
      </h2>

      {/* AI Tool Executor */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <h3 className="text-sm font-medium text-white mb-2">
          🤖 AI Tool Executor
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Ask me to do anything! I'll figure out which tool to use.
        </p>

        {/* AI Query Input */}
        <div className="mb-3">
          <input
            type="text"
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            onKeyDown={handleAIKeyDown}
            placeholder="E.g., 'show me all todos' or 'create a todo about exercise'"
            disabled={aiExecutor.isPending}
            className="w-full bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-md px-3 py-2 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Execute Button */}
        <Button
          onClick={handleAIExecute}
          disabled={aiExecutor.isPending || !aiQuery.trim()}
          size="sm"
          className="w-full bg-purple-600 text-white hover:bg-purple-500 border-purple-500 shadow-lg hover:shadow-xl transition-all duration-200 font-medium mb-3"
        >
          {aiExecutor.isPending
            ? (
              <>
                <Loader className="w-3 h-3 animate-spin mr-2" />
                Thinking...
              </>
            )
            : (
              <>
                <Sparkles className="w-3 h-3 mr-2" />
                Execute with AI
              </>
            )}
        </Button>

        {/* AI Response Display */}
        {aiExecutor.data && (
          <div className="mt-3 p-3 bg-slate-900 border border-slate-600 rounded-md">
            <div className="text-xs space-y-2">
              <div>
                <span className="text-slate-400">Reasoning:</span>
                <p className="text-slate-200 mt-1">{String((aiExecutor.data as any).reasoning)}</p>
              </div>
              <div>
                <span className="text-slate-400">Tool:</span>
                <p className="text-purple-400 mt-1 font-mono text-xs">{String((aiExecutor.data as any).toolUri)}</p>
              </div>
              {(aiExecutor.data as any).error && (
                <div>
                  <span className="text-red-400">Error:</span>
                  <p className="text-red-300 mt-1">{String((aiExecutor.data as any).error)}</p>
                </div>
              )}
              {(aiExecutor.data as any).result && (
                <div>
                  <span className="text-green-400">✓ Success!</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Original TODO Generator */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <h3 className="text-sm font-medium text-white mb-2">
          AI TODO Generator
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Ask AI to generate any kind of TODO for you!
        </p>

        {/* Custom Prompt Input */}
        <div className="mb-3">
          <input
            type="text"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="E.g., 'Generate a TODO about learning React' or leave empty for a random one"
            disabled={generateTodo.isPending}
            className="w-full bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-md px-3 py-2 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Generate TODO Button */}
        <Button
          onClick={handleGenerateTodo}
          disabled={generateTodo.isPending}
          size="sm"
          className="w-full bg-blue-600 text-white hover:bg-blue-500 border-blue-500 shadow-lg hover:shadow-xl transition-all duration-200 font-medium"
        >
          {generateTodo.isPending
            ? (
              <>
                <Loader className="w-3 h-3 animate-spin mr-2" />
                Generating...
              </>
            )
            : (
              <>
                <Sparkles className="w-3 h-3 mr-2" />
                Generate TODO with AI
              </>
            )}
        </Button>
      </div>
    </div>
  );
}

function PublicFallback() {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 text-center">
      <h3 className="text-sm font-medium text-white mb-2">Login Required</h3>
      <p className="text-xs text-slate-400 mb-4">
        Sign in to access your todos and authenticated features.
      </p>
      <UserButton />
    </div>
  );
}

function HomePage() {
  const user = useOptionalUser();

  return (
    <div className="bg-slate-900 min-h-screen flex items-center justify-center p-6">
      <div className="max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Deco"
              className="w-8 h-8 object-contain"
            />
            <div>
              <h1 className="text-xl font-semibold text-white">
                Deco MCP Template
              </h1>
              <p className="text-sm text-slate-400">
                React + Tailwind + Authentication
              </p>
            </div>
          </div>

          <UserButton />
        </div>

        {/* Main Content */}
        {user.data
          ? (
            <LoggedProvider>
              <div className="grid md:grid-cols-2 gap-8 min-h-[400px]">
                {/* Left Column - Todo List */}
                <div>
                  <TodoList />
                </div>

                {/* Right Column - AI Features */}
                <div>
                  <LoggedInContent />
                </div>
              </div>
            </LoggedProvider>
          )
          : (
            <div className="flex items-center justify-center min-h-[400px]">
              <PublicFallback />
            </div>
          )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-slate-700">
          <p className="text-xs text-slate-500 text-center">
            Template includes: Tools, Workflows, Authentication, Database
            (SQLite + Drizzle)
          </p>
        </div>
      </div>
    </div>
  );
}

export default (parentRoute: RootRoute) =>
  createRoute({
    path: "/",
    component: HomePage,
    getParentRoute: () => parentRoute,
  });
