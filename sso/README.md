# CAA Lab Students Access

This repo contains the Terraform code for deploying the AWS Organizations/SSO infrastructure for the CAA Lab.

You will need the students ([{NrCrt, Nume, Prenume, emailstud}]) stored in `./students.json`. You can find it [here](https://drive.google.com/drive/u/0/folders/1zrNxy1ofNQbo3LCLYA1H1n8vpV_pgPym). You will also need the users with admin rights (teachers) that you can also find on GDrive.

Configure the AWS CLI with the root account (026709880083) (you can make sure by running `aws sts get-caller-identity`) and run `terraform apply`.

## Adding a New Student

Add a new entry in `./students.json`, increase the count of AWS accounts in `main.tf`, and run `terraform apply`. Ideally, if you know there are inactive users, we should reuse IDs (the `NrCrt` from `students.json`) so we don't create unnecessary AWS accounts.
