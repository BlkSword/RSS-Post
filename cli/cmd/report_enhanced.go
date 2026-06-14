package cmd

import (
	"fmt"
	"os"
	"strconv"

	"github.com/rss-post/cli/internal/db"
	"github.com/rss-post/cli/internal/output"
	"github.com/spf13/cobra"
)

func init() {
	reportCmd.AddCommand(reportListCmd)
	reportCmd.AddCommand(reportShowCmd)
	reportCmd.AddCommand(reportDeleteCmd)

	reportListCmd.Flags().IntP("limit", "l", 20, "Maximum reports to show")
}

var reportListCmd = &cobra.Command{
	Use:   "list",
	Short: "List saved reports",
	Run: func(cmd *cobra.Command, args []string) {
		limit, _ := cmd.Flags().GetInt("limit")

		reports, err := db.ListSavedReports(limit)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error listing reports: %v\n", err)
			os.Exit(1)
		}

		formatter := output.NewFormatter(cfg.Output.Color)
		fmt.Println(formatter.FormatReportList(reports))
	},
}

var reportShowCmd = &cobra.Command{
	Use:   "show <id>",
	Short: "Show a saved report",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		id, err := strconv.ParseInt(args[0], 10, 64)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Invalid report ID: %v\n", err)
			os.Exit(1)
		}

		rpt, err := db.GetSavedReport(id)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Report %d not found: %v\n", id, err)
			os.Exit(1)
		}

		fmt.Printf("Report #%d (%s, %s)\n", rpt.ID, rpt.Type, rpt.Date)
		fmt.Printf("Generated: %s\n\n", rpt.CreatedAt)
		fmt.Println(rpt.Content)
	},
}

var reportDeleteCmd = &cobra.Command{
	Use:   "delete <id>",
	Short: "Delete a saved report",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		id, err := strconv.ParseInt(args[0], 10, 64)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Invalid report ID: %v\n", err)
			os.Exit(1)
		}

		err = db.DeleteSavedReport(id)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error deleting report: %v\n", err)
			os.Exit(1)
		}
		fmt.Printf("Report %d deleted.\n", id)
	},
}
