# CAA Lab Students Access

This repo contains the Terraform code for deploying the AWS Organizations/SSO infrastructure for the CAA Lab.

You will need the students ([{NrCrt, Nume, Prenume, emailstud}]) stored in a json file (the path to it must be specified in `students_path`) (check Google Drive, current year). You will also need the users with admin rights (teachers) that you can also find on Google Drive.

Configure the AWS CLI with the root account (026709880083) (you can make sure by running `aws sts get-caller-identity`) and run `terraform apply`.

## Adding a New Student

Add a new entry in `students.json`, increase the count of AWS accounts in `main.tf`, and run `terraform apply`. Ideally, if you know there are inactive users, reuse IDs (the `NrCrt` from `students.json`) so we don't create unnecessary AWS accounts.
