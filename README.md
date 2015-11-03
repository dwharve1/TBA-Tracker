#TBA-Tracker

## Overview
TBA-Tracker is a script written in Javascript/HTML/CSS, for the purpose of tracking TBA Milestone completion progress. 

## Security Concerns
TBA-Tracker executes Javascript from within a Hyper Text Application (HTA). 

###### HTAs

The HTA interpreter is an approved software built in to the Windows operating system. HTAs are given the same rights as a self-executable. Windows controls the rights for the user currently logged in and extends those rights to the HTA. Essentially, what the user logged in is able to do to the local system, is what the HTA can do, no more. 

HTAs use Internet Explorer to display HTML/CSS and interpret Javascript. The difference between the two is HTAs remove a layer of security that Internet Explorer imposes. Specifically, access to the local file system and cross site scripting. TBA-Tracker needs file system access to save the data that is scrapped from TBA, reducing the amount of required calls to TBA servers. Cross site scripting is also used as the method in which data from TBA is scrapped. While HTAs remove a security layer, the risk is mitigated by not evaluating external code. This effectively does not increase the risk to security, given that proper coding practices are observed.

###### XMLHTTPRequest (Ajax)

TBA-Tracker uses Ajax requests to scrape data from TBA. These requests return the servers response as a string. The resources and scripting within the returned response are not interpreted.

Since the software utilized by TBA-Tracker is already approved, ultimately no new risks are introduced.
