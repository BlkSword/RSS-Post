package cmd

import (
	"fmt"
	"os"

	"github.com/rss-post/cli/internal/db"
	"github.com/rss-post/cli/internal/output"
	"github.com/spf13/cobra"
)

// addSearchEnhancements registers search sub-commands (history, suggestions, etc.).
func addSearchEnhancements() {
	searchCmd.AddCommand(searchHistoryCmd)
	searchCmd.AddCommand(searchClearHistoryCmd)
	searchCmd.AddCommand(searchSuggestCmd)

	searchHistoryCmd.Flags().IntP("limit", "l", 20, "Maximum history entries")
	searchSuggestCmd.Flags().IntP("limit", "l", 10, "Maximum suggestions")
}

var searchHistoryCmd = &cobra.Command{
	Use:   "history",
	Short: "Show search history",
	Run: func(cmd *cobra.Command, args []string) {
		limit, _ := cmd.Flags().GetInt("limit")

		history, err := db.GetSearchHistory(limit)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error getting search history: %v\n", err)
			os.Exit(1)
		}

		if len(history) == 0 {
			fmt.Println("No search history.")
			return
		}

		formatter := output.NewFormatter(cfg.Output.Color)
		fmt.Println(formatter.FormatSearchHistory(history))
	},
}

var searchClearHistoryCmd = &cobra.Command{
	Use:   "clear-history",
	Short: "Clear search history",
	Run: func(cmd *cobra.Command, args []string) {
		err := db.ClearSearchHistory()
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error clearing search history: %v\n", err)
			os.Exit(1)
		}
		fmt.Println("Search history cleared.")
	},
}

var searchSuggestCmd = &cobra.Command{
	Use:   "suggest <prefix>",
	Short: "Get search suggestions",
	Long:  `Get search suggestions based on existing entry titles and tags.`,
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		prefix := args[0]
		limit, _ := cmd.Flags().GetInt("limit")

		suggestions, err := db.GetSearchSuggestions(prefix, limit)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error getting suggestions: %v\n", err)
			os.Exit(1)
		}

		if len(suggestions) == 0 {
			fmt.Printf("No suggestions for '%s'.\n", prefix)
			return
		}

		for _, s := range suggestions {
			fmt.Printf("  %s\n", s)
		}
	},
}
