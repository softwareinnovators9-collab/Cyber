Description of Software Test Metrics Implementation in CyberShield
In the CyberShield project, we added a complete set of software test metrics to continuously measure the quality, reliability, and effectiveness of the system during normal use. These metrics run silently in the background without affecting the user interface or dashboard performance. The goal was to collect real, practical data about how well the application works, how easy it is to test, and how many issues might still remain  all stored automatically so we can analyze results later for our empirical study.
Overall Implementation Approach
We created three small, independent JavaScript files that work separately from each other and from the existing page visit and load-time trackers;
-	`test-metrics.js` – Handles basic test execution and success rates
-	`built-in-test-harness.js` – Uses standard browser tools to check the system
Each file;
-	Starts automatically when any page loads (after a short delay so all data is ready)
-	Collects information while the user interacts with the dashboard, devices, threats, or other sections
-	Saves results as simple JSON objects in the browser’s localStorage
-	Keeps only the most recent 30 runs to avoid filling up memory

Because everything is independent and uses only built-in browser features, the metrics add zero extra load and work even if the internet is offline.
Key Metrics and How They Work
1.	Test Pass, Failure, and Pending Rates
The system runs a set of quick automatic checks on the sample data and core functions (for example, making sure device lists load correctly, filters work, and time displays update).  
  It counts how many checks succeed, how many fail, and notes any that could not run.  
   These counts are turned into simple percentages (e.g., “92% of tests passed”).  
   Results are saved under a dedicated key so we can see trends over time.
2.	 Test Coverage
   Two practical coverage numbers are calculated automatically;
-	GUI coverage. The code counts how many visible elements (buttons, cards, rows, modals, search boxes, etc.) are present and active on the current page.  
-	Component coverage. It checks which major JavaScript modules (dashboard, devices, threats, etc.) have been loaded and are functioning.  
-	These give us a clear picture of how much of the interface and code is actually being exercised during normal use.
3.	Software Testability (Controllability)
We look at the main decision points in the code (such as risk-level filters, modal open/close logic, and search functions).  
For each decision point we check whether it can be controlled directly by user actions or if it depends on hidden internal states.  
A simple average score is calculated (between 0 and 1) to show how easy or difficult it is to test each part of the system.  
Higher scores mean the code is more straightforward to verify.
4.	Remaining Defects Estimation
To estimate how many hidden problems might still exist, the system “seeds” a few fake issues into the sample data.  
It then runs the regular checks and counts how many of those seeded issues are caught.  
Using the ratio of caught vs. total seeded issues, it estimates the total number of remaining real defects.
This gives us a useful number we can compare across different versions of the project.
Supporting Built-in Test Mechanisms
To make the metrics more reliable, we also added four lightweight built-in checks that run every time;
-	Simple assertion checks on data and functions
-	Automatic catching of any runtime errors
-	Performance timing of key operations (using the browser’s built-in timing tools)
-	Validation that important page elements exist and respond to clicks
All of these feed directly into the four main metrics above.
 How to Access and Use the Data
After opening any page, the metrics finish collecting within a couple of seconds.  
This prints all four metrics with timestamps and full history.  
The data can be copied into a spreadsheet for charts, averages, or inclusion in our final report.

A table showing the tests made on our project
Feature / Module,Test ID,Test Description,Action / Input,Expected Result
Dashboard,D1,View overall security status,Open the dashboard page,"Displays stat cards, threat trend chart, and recent activity table correctly"
Dashboard,D2,Refresh dashboard data,Click any refresh button (if available),All cards and charts update with latest mock values without page reload
Devices Inventory,DV1,List all devices,Navigate to Devices page,"Table shows all devices with correct risk levels, status, and details"
Devices Inventory,DV2,Filter devices by risk level,"Select ""High"" risk filter",Only high-risk devices are displayed
Devices Inventory,DV3,Quarantine a device,"Click ""Quarantine"" on a device row","Device status changes to ""Quarantined"", toast notification appears"
Devices Inventory,DV4,Search for a specific device,Type device name or IP in search box,Matching devices appear; non-matching ones are hidden
Threats Tracking,TH1,Display all active threats,Navigate to Threats page,"Threat list loads with severity, type, and status"
Threats Tracking,TH2,Filter threats by severity,"Select ""Critical"" severity filter",Only critical threats are shown
Threats Tracking,TH3,Assign a threat to a user,Open threat details and assign to a team member,"Assignment updates, confirmation message shown"
Incidents Management,IN1,Create a new incident,"Click ""Add Incident"" and fill required fields",New incident appears in the table with correct details
Incidents Management,IN2,Update incident status,Change status of an existing incident,Status badge updates immediately in the table
Incidents Management,IN3,Delete an incident,Click delete icon on an incident,Incident is removed from the list
Audit Logs,AU1,View complete audit trail,Navigate to Audit page,All log entries are displayed with timestamps and actions
Audit Logs,AU2,Search audit logs,"Enter keyword (e.g., ""login"") in search box",Only matching log entries are shown
Audit Logs,AU3,Export audit logs,Click Export CSV button,A CSV file downloads containing all visible log entries
Users Management,US1,List all system users,Navigate to Users page,"User table displays names, roles, and emails"
Users Management,US2,Add a new user,"Fill and submit ""Add User"" form",New user appears in the table with correct role
Users Management,US3,Change user role,Edit an existing user and update role,Role updates and is reflected in the table
Navigation & Layout,NAV1,Switch between all main sections,Click each sidebar menu item,Correct page loads smoothly without errors
Navigation & Layout,NAV2,Responsive layout on mobile view,Resize browser window to mobile size,Layout adjusts properly; all buttons and tables remain usable
General Functionality,GEN1,Toast notifications,Perform any action that triggers a notification,Toast appears and disappears automatically
General Functionality,GEN2,Modal dialog handling,Open any modal (add/edit) and cancel,Modal closes without saving changes
General Functionality,GEN3,Data persistence across refreshes,Make changes then refresh the page,"Changes (e.g., quarantined device, new incident) remain visible"
Error Handling,ERR1,Invalid input in forms,Submit form with missing required fields,Form shows validation error and does not submit
Error Handling,ERR2,Search with no results,Search for a non-existent device or threat,"""No results"" message or empty state is displayed"
