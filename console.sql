CREATE TABLE Course
(
    courseID   INT,
    courseName VARCHAR(50),
    CONSTRAINT PK_Course PRIMARY KEY (courseID)
)
GO

INSERT INTO Course
VALUES (1, 'MSc/PG Diploma in Information Technology'),
       (2, 'MSc/PG Diploma in Multimedia Technology')
GO

CREATE TABLE District
(
    districtCode CHAR(5),
    districtName VARCHAR(15),
    CONSTRAINT PK_District PRIMARY KEY (districtCode)
)
GO

INSERT INTO District
VALUES ('LK-11', 'Colombo'),
       ('LK-12', 'Gampaha'),
       ('LK-13', 'Kalutara'),
       ('LK-21', 'Kandy'),
       ('LK-22', 'Matale'),
       ('LK-23', 'Nuwara Eliya'),
       ('LK-31', 'Galle'),
       ('LK-32', 'Matara'),
       ('LK-33', 'Hambantota'),
       ('LK-41', 'Jaffan'),
       ('LK-42', 'Kilinochchi'),
       ('LK-43', 'Mannar'),
       ('LK-44', 'Vavuniya'),
       ('LK-45', 'Mulativu'),
       ('LK-51', 'Batticaloa'),
       ('LK-52', 'Ampara'),
       ('LK-53', 'Trincomalee'),
       ('LK-61', 'Kuranegala'),
       ('LK-62', 'Puttalam'),
       ('LK-71', 'Anurashapura'),
       ('LK-72', 'Polonnaruwa'),
       ('LK-81', 'Badulla'),
       ('LK-82', 'Monaragala'),
       ('LK-91', 'Ratnapura'),
       ('LK-92', 'Kegalle')
GO

CREATE TABLE Province
(
    provinceCode CHAR(4),
    provinceName VARCHAR(25),
    CONSTRAINT PK_Province PRIMARY KEY (provinceCode)
)
GO

INSERT INTO Province
VALUES ('LK-1', 'Western Province'),
       ('LK-2', 'Central Province'),
       ('LK-3', 'Southern Province'),
       ('LK-4', 'Northern Province'),
       ('LK-5', 'Eastern Province'),
       ('LK-6', 'North Western Province'),
       ('LK-7', 'North Central Province'),
       ('LK-8', 'Uva Province'),
       ('LK-9', 'Sabaragamuwa Province')
GO

CREATE TABLE Role
(
    roleID   INT NOT NULL,
    roleName VARCHAR(10),
    CONSTRAINT PK_Role PRIMARY KEY (roleID)
)
GO

INSERT INTO Role
VALUES (1, 'Admin'),
       (2, 'Teacher'),
       (3, 'Student')
GO

CREATE TABLE Users
(
    username  CHAR(7),
    password  VARCHAR(50),
    email     VARCHAR(50),
    firstName VARCHAR(50),
    lastName  VARCHAR(50),
	title	  VARCHAR(10),
    role      INT,
	status    INT DEFAULT 1,
    CONSTRAINT PK_Users PRIMARY KEY (username),
    CONSTRAINT CK_password CHECK (LEN(password) >= 4),
    CONSTRAINT FK_Users_role FOREIGN KEY (role) REFERENCES Role (roleID)
)
GO

INSERT INTO Users
VALUES ('184061R', '1234', 'vishvajayasanka@gmail.com', 'A.K.V', 'Jayasanka', 3),
       ('100000R', '1234', 'natalie.portman@gmail.com', 'Natalie', 'Portman', 1),
       ('100001R', '1234', 'taylor.swift@yahoo.com', 'Taylor', 'Swift', 2);
GO

CREATE TABLE Student
(
    studentID        CHAR(7) NOT NULL,
    courseID         INT,
    fullName         VARCHAR(100),
    nameWithInitials VARCHAR(100),
    address          VARCHAR(225),
    district         CHAR(5),
    province         CHAR(4),
    dateOfBirth      DATE,
    race             VARCHAR(15),
    religion         VARCHAR(15),
    gender           CHAR(1),
    nic              VARCHAR(12),
    mobile           VARCHAR(12),
    home             VARCHAR(12),
    designation      VARCHAR(50),
    employer         VARCHAR(50),
    company          VARCHAR(50),
    academicYear     INT,
    CONSTRAINT PK_Student PRIMARY KEY (studentID),
    CONSTRAINT FK_course FOREIGN KEY (courseID) REFERENCES Course (courseID),
    CONSTRAINT FK_district FOREIGN KEY (district) REFERENCES District (districtCode),
    CONSTRAINT FK_province FOREIGN KEY (province) REFERENCES Province (provinceCode),
    CONSTRAINT FK_studentID FOREIGN KEY (studentID) REFERENCES Users (username),
)
GO

INSERT INTO Student
VALUES ('184061R', 1, 'Vishwa Jayasanka Atapattu', 'A.K.V.Jayasanka', 'Ihalagewatta, Naimana South, Matara', 'LK-32',
        'LK-4', '1998-01-09', 'Sinhala', 'Buddhist', 'M', '199800910054', '0719251862', '0412229637', 'No Job',
        'No One', 'No Job Company', 2020)
GO

CREATE TABLE Admin
(
    adminID     CHAR(7) NOT NULL,
    designation VARCHAR(50),
    CONSTRAINT PK_Admin PRIMARY KEY (adminID),
    CONSTRAINT FK_Admin FOREIGN KEY (adminID) REFERENCES Users (username)
)
GO

INSERT INTO Admin
VALUES ('100000R', 'System Administrator')
GO

CREATE TABLE Teacher
(
    teacherID CHAR(7) NOT NULL,
    education VARCHAR(50),
    CONSTRAINT PK_Teacher PRIMARY KEY (teacherID),
    CONSTRAINT FK_Teacher FOREIGN KEY (teacherID) REFERENCES Users (username)
)
GO

INSERT INTO Teacher
VALUES ('100001R', 'Phd Computer Science')
GO

CREATE TABLE Module
(
    moduleCode  Char(6),
    moduleName  VARCHAR(50),
    description VARCHAR(500),
    credits     REAL,
    CONSTRAINT PK_Module PRIMARY KEY (moduleCode)
)
GO

INSERT INTO Module
VALUES ('CM5401', 'Computer Intelligence',
        'Artificial intelligence (AI), is intelligence demonstrated by machines, unlike the natural intelligence displayed by humans and animals.',
        3),
       ('IN5101', 'Programming and Program Design',
        'Computer programming is the process of designing and building an executable computer program to accomplish a specific computing result or to perform a specific task. Programming involves tasks such as: analysis, generating algorithms, profiling algorithms accuracy and resource consumption, and the implementation of algorithms in a chosen programming language (commonly referred to as coding).',
        3),
       ('IN5110', 'Object Oriented Programming',
        'Object-oriented programming (OOP) is a programming paradigm based on the concept of ""objects"', 3),
       ('IN5120', 'Distributed Systems and Network Programming',
        'Distributed computing is a field of computer science that studies distributed systems. A distributed system is a system whose components are located on different networked computers',
        3),
       ('IN5200', 'Software Engineering',
        'Software engineering is the systematic application of engineering approaches to the development of software. Software engineering is a computing discipline.',
        3),
       ('IN5210', 'System Analysis and Design',
        'System analysis is ""the process of studying a procedure or business in order to identify its goals and purposes and create systems and procedures that will achieve them in an efficient way.',
        3),
       ('IN5300', 'Computer Organization',
        'In computer engineering, computer architecture is a set of rules and methods that describe the functionality, organization, and implementation of computer systems. Some definitions of architecture define it as describing the capabilities and programming model of a computer but not a particular implementation.',
        3),
       ('IN5310', 'Operating Systems', 'An operating system (OS) is system software that manages computer hardware', 3),
       ('IN5400', 'Database Management Systems',
        'The database management system (DBMS) is the software that interacts with end users', 3),
       ('IN5410', 'Data Mining and Data Warehousing',
        'Data mining is a process of discovering patterns in large data sets involving methods at the intersection of machine learning',
        3),
       ('IN5500', 'Data Communication and Computer Networks',
        'A computer network is a group of computers that use a set of common communication protocols over digital interconnections for the purpose of sharing resources located on or provided by the network nodes.',
        3),
       ('IN5600', 'Multimedia Systems',
        'Multimedia is a form of communication that combines different content forms such as text', 3),
       ('IN5610', 'Image Processing and Computer Graphics',
        'Digital image processing is the use of a digital computer to process digital images through an algorithm. As a subcategory or field of digital signal processing.',
        3),
       ('IN5620', 'Web Programming and eBusiness Systems',
        'Web development is the work involved in developing a Web site for the Internet (World Wide Web) or an intranet (a private network).',
        3),
       ('IN5700', 'Human Computer Interaction',
        N'Human–computer interaction (HCI) studies the design and use of computer technology, focused on the interfaces between people (users) and computers. Researchers in the field of HCI observe the ways in which humans interact with computers and design technologies that let humans interact with computers in novel ways.',
        3),
       ('IN5900', 'PG Deploma Project', NULL, 4),
       ('IN5910', 'Literature Review and Thesis Writing',
        'A thesis or dissertation is a document submitted in support of candidature for an academic degree or professional qualification presenting the research and findings.',
        3),
       ('IN6900', 'Msc Project', NULL, 16),
       ('IN6910', 'Research Project', NULL, 3),
       ('IS5400', 'Management Information Systems',
        'A management information system (MIS) is an information system used for decision-making, and for the coordination, control, analysis, and visualization of information in an organization.',
        3),
       ('IS5410', 'IT Project Management',
        'Project management is the process of leading the work of a team to achieve goals and meet success criteria at a specified time. The primary challenge of project management is to achieve all of the project goals within the given constraints.',
        3),
       ('IS5420', 'Quality Assurance',
        'Quality assurance (QA) is a way of preventing mistakes and defects in manufactured products and avoiding problems when delivering products or services to customers; which ISO 9000 defines as ""part of quality management focused on providing confidence that quality requirements will be fulfilled.',
        3)
GO

CREATE TABLE Enrollment
(
    enrollmentID INT IDENTITY (1, 1) NOT NULL,
    studentID    CHAR(7),
    semester     INT,
    batch        INT,
    date         DATE,
    CONSTRAINT PK_Enrollment PRIMARY KEY (enrollmentID),
    CONSTRAINT FK_Enrollment FOREIGN KEY (studentID) REFERENCES Student (studentID)
)
GO

INSERT INTO Enrollment(studentID, semester, batch, date)
VALUES ('184061R', 1, 2020, '2020-02-12'),
       ('184061R', 2, 2020, '2020-08-12')
GO

CREATE TABLE EnrollmentModule
(
    enrollmentID INT NOT NULL,
    moduleCode   CHAR(6),
    CONSTRAINT PK_EnrollmentModule PRIMARY KEY (enrollmentID, moduleCode),
    CONSTRAINT FK_EnrollmentModule_moduleCode FOREIGN KEY (moduleCode) REFERENCES Module (moduleCode),
    CONSTRAINT FK_EnrollmentModule_enrollmentID FOREIGN KEY (enrollmentID) REFERENCES Enrollment (enrollmentID)
)
GO

INSERT INTO EnrollmentModule
VALUES (1, 'IN5101'),
       (1, 'IN5110'),
       (1, 'IN5120'),
       (1, 'IN5200'),
       (2, 'IN5210'),
       (2, 'IN5300'),
       (2, 'IN5310'),
       (2, 'IN5400')
GO

CREATE TABLE Assignment
(
    teacherID  CHAR(7) NOT NULL,
    moduleCode CHAR(6) NOT NULL,
    CONSTRAINT PK_Assignment PRIMARY KEY (teacherID, moduleCode),
    CONSTRAINT FK_Assignment_teacherID FOREIGN KEY (teacherID) REFERENCES Teacher (teacherID),
    CONSTRAINT FK_Assignment_moduleCode FOREIGN KEY (moduleCode) REFERENCES Module (moduleCode)
)
GO

INSERT INTO Assignment
VALUES ('100001R', 'IN5101'),
       ('100001R', 'IN5110')
GO

CREATE TABLE LectureHour
(
    lectureHourID INT NOT NULL IDENTITY (1, 1),
    moduleCode    CHAR(6),
    type          VARCHAR(15),
    startingTime  TIME,
    endingTime    TIME,
    day           INT,
    lectureHall   VARCHAR(20),
    CONSTRAINT PK_LectureHour PRIMARY KEY (lectureHourID),
    CONSTRAINT FK_LectureHour FOREIGN KEY (moduleCode) REFERENCES Module (moduleCode)
)
GO

INSERT INTO LectureHour (moduleCode, type, startingTime, endingTime, day, lectureHall)
VALUES ('IN5101', 'Lecture', '08:15:00', '10:15:00', 2, 'Phase 1 Auditorium'),
       ('IN5101', 'Lab Session', '10:30:00', '12:30:00', 2, 'Lab 3'),
       ('IN5200', 'Lecture', '13:15:00', '15:15:00', 2, 'L1H01'),
       ('IN5110', 'Lecture', '08:15:00', '10:15:00', 3, 'Phase 1 Auditorium'),
       ('IN5110', 'Lab Session', '10:30:00', '12:30:00', 3, 'Lab 2'),
       ('IN5200', 'Lab Session', '15:30:00', '17:30:00', 2, 'Lab 2')
GO

CREATE TABLE Exam
(
    examID       INT NOT NULL IDENTITY (1, 1),
    moduleCode   CHAR(6),
    dateHeld     DATE,
    academicYear INT,
    CONSTRAINT PK_Exam PRIMARY KEY (examID),
    CONSTRAINT FK_moduleCode FOREIGN KEY (moduleCode) REFERENCES Module (moduleCode)
)
GO

INSERT INTO Exam (moduleCode, dateHeld, academicyear)
VALUES ('IN5101', '2020-01-10', 2020),
       ('IN5110', '2020-01-12', 2020)
GO

CREATE TABLE Mark
(
    examID    INT     NOT NULL,
    studentID CHAR(7) NOT NULL,
    mark      INT,
    grade     VARCHAR(2),
    CONSTRAINT PK_Mark PRIMARY KEY (examID, studentID),
    CONSTRAINT FK_Mark_studentID FOREIGN KEY (studentID) REFERENCES Student (studentID)
)
GO

CREATE TABLE Session
(
    sessionID     INT IDENTITY (1, 1) NOT NULL,
    lectureHourID INT,
    date          DATE,
    batch         INT,
    CONSTRAINT PK_session PRIMARY KEY (sessionID),
    CONSTRAINT FK_lectureHourID FOREIGN KEY (lectureHourID) REFERENCES LectureHour (lectureHourID)
)
GO

INSERT INTO Session (lectureHourID, date, batch)
VALUES (1, '2021-01-05', 2020),
       (1, '2021-01-12', 2020),
       (1, '2021-01-19', 2020)
GO

CREATE TABLE Attendance
(
    sessionID INT,
    studentID CHAR(7),
    CONSTRAINT PK_Attendance PRIMARY KEY (sessionID, studentID),
    CONSTRAINT FK_sessionID FOREIGN KEY (sessionID) REFERENCES Session (sessionID),
    CONSTRAINT FK_Attendance_studentID FOREIGN KEY (studentID) REFERENCES Student (studentID)
)
GO

INSERT INTO Attendance
VALUES (1, '184061R'),
       (3, '184061R')
GO

INSERT INTO Mark
VALUES (1, '184061R', 85, 'A+'),
       (2, '184061r', 75, 'A-')
GO

CREATE TABLE Notification
(
    notificationID INT IDENTITY (1, 1),
    subject VARCHAR(100),
    message VARCHAR(500),
    timeSent DATETIME,
    sentBy CHAR(7)
    CONSTRAINT PK_notification PRIMARY KEY (notificationID),
    CONSTRAINT FK_sentBy FOREIGN KEY (sentBy) REFERENCES Users(username)
)
GO

CREATE TABLE Received
(
    notificationID INT,
    recipientID CHAR(7),
    received BIT,
    CONSTRAINT PK_read PRIMARY KEY (notificationID, recipientID),
    CONSTRAINT FK_received FOREIGN KEY (recipientID) REFERENCES Users(username)
)
GO

CREATE TABLE EducationQualification
(
    qualificationID INT IDENTITY (1,1),
    studentID CHAR(7),
    degree VARCHAR(50),
    institute VARCHAR(50),
    dateCompleted DATE,
    class VARCHAR(20),
    CONSTRAINT PK_education_qualification PRIMARY KEY (qualificationID),
    CONSTRAINT FK_eqducation_qualification FOREIGN KEY (studentID) REFERENCES Student(studentID)
)

-- Check user credentials.
CREATE TYPE USER_DETAILS AS TABLE
(
    username  CHAR(7),
    firstName VARCHAR(20),
    lastName  VARCHAR(20),
    email     VARCHAR(50),
    role      VARCHAR(10)
)
GO

CREATE PROCEDURE checkUserCredentials @username CHAR(7), @password VARCHAR(20)
AS
DECLARE @userDetails USER_DETAILS, @status BIT
INSERT INTO @userDetails
SELECT U.username, U.firstName, U.lastName, U.email, R.roleName
FROM Users U,
     Role R
WHERE username = @username
  AND password = @password
  AND U.role = R.roleID
    IF EXISTS(SELECT *
              FROM @userDetails)
        BEGIN
            SELECT * FROM @userDetails
            SET @status = 1
        END
    ELSE
        BEGIN
            SET @status = 0
        END
    RETURN @status
GO

-- Check validity of username
CREATE PROCEDURE checkValidity @username CHAR(7) AS
DECLARE @status BIT
    IF EXISTS(SELECT * FROM Users WHERE username = @username)
        BEGIN
            SELECT U.username, R.roleID, CONCAT(U.firstName, ' ', U.lastName) as name
            FROM Users U, Role R
            WHERE U.username = @username AND U.role = R.roleID
            SET @status = 1
        END
    ELSE
        BEGIN
            SET @status = 0
        END
    RETURN @status
GO

-- Check if an given ID number relates to a student.
CREATE PROCEDURE checkStudentID @studentID CHAR(7) AS
    IF EXISTS(SELECT 1
              FROM Student S,
                   Course C
              WHERE studentID = @studentID
                AND C.courseID = S.courseID)
        BEGIN
            SELECT S.fullName name, C.courseName course, S.academicYear academicYear
            FROM Student S,
                 Course C
            WHERE studentID = @studentID
              AND C.courseID = S.courseID;
            RETURN 0;
        END
    ELSE
        RETURN -1;
GO

-- Get modules according to the user role.
CREATE PROCEDURE getModules @username CHAR(7), @role INT AS
    IF @role = 3
        BEGIN

            SELECT M.moduleCode, M.moduleName, M.description, M.credits, E.semester
            FROM Enrollment E,
                 EnrollmentModule EM,
                 Module M
            WHERE E.studentID = @username
              AND E.enrollmentID = EM.enrollmentID
              AND EM.moduleCode = M.moduleCode

            SELECT A.moduleCode, U.firstName, U.lastName
            FROM Users U,
                 Assignment A,
                 Enrollment E,
                 EnrollmentModule EM
            WHERE E.studentID = @username
              AND EM.enrollmentID = E.enrollmentID
              AND A.moduleCode = EM.moduleCode
              AND A.teacherID = U.username
            GROUP BY A.moduleCode, U.firstName, U.lastName

            SELECT L.moduleCode,
                   L.type,
                   CONVERT(VARCHAR(8), L.startingTime, 8) AS startingTime,
                   CONVERT(VARCHAR(8), L.endingTime, 8)   AS endingTime,
                   L.day,
                   L.lectureHall
            FROM Enrollment E,
                 EnrollmentModule EM,
                 LectureHour L
            WHERE E.studentID = @username
              AND E.enrollmentID = EM.enrollmentID
              AND EM.moduleCode = L.moduleCode
            GROUP BY L.moduleCode, L.type, L.startingTime, L.endingTime, L.day, L.lectureHall

            SELECT C.courseID, C.courseName
            FROM Student S,
                 Course C
            WHERE S.studentID = @username
              AND C.courseID = S.courseID

        END
    ELSE
        IF @role = 2
            BEGIN

                SELECT M.moduleCode, M.moduleName, M.description, M.credits
                FROM Assignment A,
                     Module M
                WHERE A.teacherID = @username
                  AND A.moduleCode = M.moduleCode


                SELECT A.moduleCode, U.firstName, U.lastName
                FROM Users U,
                     Assignment A
                WHERE A.moduleCode IN (SELECT A1.moduleCode FROM Assignment A1 WHERE A1.teacherID = @username)
                  AND A.teacherID = U.username

                SELECT L.moduleCode,
                       L.type,
                       CONVERT(VARCHAR(8), L.startingTime, 8) AS startingTime,
                       CONVERT(VARCHAR(8), L.endingTime, 8)   AS endingTime,
                       L.day,
                       L.lectureHall
                FROM Assignment A,
                     LectureHour L
                WHERE A.teacherID = @username
                  AND A.moduleCode = L.moduleCode

            END
        ELSE
            BEGIN

                SELECT * FROM Module

                SELECT A.moduleCode, U.firstName, U.lastName
                FROM Assignment A,
                     Users U
                WHERE A.teacherID = U.username

                SELECT moduleCode,
                       type,
                       CONVERT(VARCHAR(8), startingTime, 8) AS startingTime,
                       CONVERT(VARCHAR(8), endingTime, 8)   AS endingTime,
                       day,
                       lectureHall
                FROM LectureHour

            END

GO

-- Get module details of a given module code.
CREATE PROCEDURE getModuleDetails @moduleCode CHAR(6) AS
    IF EXISTS(SELECT *
              FROM Module
              WHERE moduleCode = @moduleCode)
        BEGIN

            SELECT *
            FROM Module
            WHERE moduleCode = @moduleCode;

            SELECT U.username, U.firstName, U.lastName
            FROM Assignment A,
                 Users U
            WHERE A.moduleCode = @moduleCode
              AND A.teacherID = U.username;

            SELECT L.lectureHourID,
                   L.type,
                   CONVERT(VARCHAR(8), L.startingTime, 8) AS startingTime,
                   CONVERT(VARCHAR(8), L.endingTime, 8)   AS endingTime,
                   L.day,
                   L.lectureHall
            FROM LectureHour L
            WHERE L.moduleCode = @moduleCode;

            RETURN 0;

        END
    ELSE
        RETURN -1;

GO

-- Check if a module exists with a given module code.
CREATE PROCEDURE checkModule @moduleCode CHAR(6) AS
    IF EXISTS(SELECT 1
              FROM Module
              WHERE moduleCode = @moduleCode)
        BEGIN
            SELECT moduleName FROM Module WHERE moduleCode = @moduleCode
            RETURN 0
        END
    ELSE
        BEGIN
            RETURN 1
        END
GO

-- Add new module to the database.
CREATE TYPE LECTURE_HOUR AS TABLE
(
    lectureHourID INT,
    type          VARCHAR(15),
    day           INT,
    lectureHall   VARCHAR(20),
    startingTime  CHAR(8),
    endingTime    CHAR(8)
)
GO

CREATE TYPE TEACHER AS TABLE
(
    username CHAR(7)
)
GO

CREATE PROCEDURE addModule @moduleCode CHAR(6),
                           @moduleName VARCHAR(50),
                           @description VARCHAR(500),
                           @credits REAL,
                           @lectureHours LECTURE_HOUR READONLY,
                           @teachers TEACHER READONLY
AS
    BEGIN TRANSACTION

DECLARE
    @lectureHourID INT, @type VARCHAR(15), @day INT, @lectureHall VARCHAR(20), @startingTIme CHAR(8), @endingTime CHAR(8), @teacherID CHAR(7)
    IF EXISTS(SELECT *
              FROM Module
              WHERE moduleCode = @moduleCode)
        BEGIN

            UPDATE Module
            SET moduleName=@moduleName,
                description=@description,
                credits=@credits
            WHERE moduleCode = @moduleCode
            IF @@ROWCOUNT = 0 GOTO errorHandler

            IF EXISTS(SELECT 1 FROM @lectureHours WHERE lectureHourID != 0)
                BEGIN

                    DELETE
                    FROM LectureHour
                    WHERE lectureHourID NOT IN (SELECT lectureHourID FROM @lectureHours)
                      AND moduleCode = @moduleCode

                    DECLARE cursor_lectureHours CURSOR FOR SELECT * FROM @lectureHours WHERE lectureHourID != 0
                    OPEN cursor_lectureHours
                    FETCH NEXT FROM cursor_lectureHours INTO @lectureHourID, @type, @day, @lectureHall, @startingTime, @endingTime
                    WHILE @@FETCH_STATUS = 0
                        BEGIN
                            UPDATE LectureHour
                            SET type=@type,
                                startingTime=@startingTIme,
                                endingTime=@endingTime,
                                day=@day,
                                lectureHall=@lectureHall
                            WHERE lectureHourID = @lectureHourID
                            IF @@ROWCOUNT = 0 GOTO errorHandler
                            FETCH NEXT FROM cursor_lectureHours INTO @lectureHourID, @type, @day, @lectureHall, @startingTime, @endingTime
                        END

                END

            DELETE FROM Assignment WHERE moduleCode = @moduleCode

        END
    ELSE
        BEGIN

            INSERT INTO Module
            VALUES (@moduleCode, @moduleName, @description, @credits)
            IF @@ROWCOUNT = 0 GOTO errorHandler

        END
    IF EXISTS(SELECT 1
              FROM @lectureHours
              WHERE lectureHourID = 0)
        BEGIN
            DECLARE cursor_newLectureHours CURSOR FOR SELECT * FROM @lectureHours WHERE lectureHourID = 0
            OPEN cursor_newLectureHours
            FETCH NEXT FROM cursor_newLectureHours INTO @lectureHourID, @type, @day, @lectureHall, @startingTime, @endingTime
            WHILE @@FETCH_STATUS = 0
                BEGIN
                    INSERT INTO LectureHour (moduleCode, type, startingTime, endingTime, day, lectureHall)
                    VALUES (@moduleCode, @type, @startingTIme, @endingTime, @day, @lectureHall)
                    IF @@ROWCOUNT = 0 GOTO errorHandler
                    FETCH NEXT FROM cursor_newLectureHours INTO @lectureHourID, @type, @day, @lectureHall, @startingTime, @endingTime
                END
        END

DECLARE
    cursor_teachers CURSOR FOR SELECT *
                               FROM @teachers
    OPEN cursor_teachers
    FETCH NEXT FROM cursor_teachers INTO @teacherID
    WHILE @@FETCH_STATUS = 0
        BEGIN
            INSERT INTO Assignment VALUES (@teacherID, @moduleCode)
            IF @@ROWCOUNT = 0 GOTO errorHandler
            FETCH NEXT FROM cursor_teachers INTO @teacherID
        END

    COMMIT TRANSACTION
    RETURN 0
    errorHandler:
    ROLLBACK TRANSACTION
    PRINT 'Transaction Failed..!'
    RETURN -1
GO

-- Enroll student to a semester
CREATE TYPE REGISTRATION_MODULE AS TABLE
(
    moduleCode CHAR(6)
)
GO

CREATE PROCEDURE enrollStudent @studentID CHAR(7), @semester INT, @modules REGISTRATION_MODULE READONLY AS
    BEGIN TRANSACTION
INSERT INTO Enrollment (studentID, semester, date)
VALUES (@studentID, @semester, GETDATE())

DECLARE @moduleCode CHAR(6)
DECLARE
    cursor_modules CURSOR FOR SELECT *
                              FROM @modules;
    OPEN cursor_modules;
    FETCH NEXT FROM cursor_modules INTO @moduleCode;

    WHILE @@fetch_status = 0
        BEGIN
            INSERT INTO EnrollmentModule
            VALUES (IDENT_CURRENT('Enrollment'), @moduleCode);
            FETCH NEXT FROM cursor_modules INTO @moduleCode
        END
    COMMIT TRANSACTION
    RETURN 0;

    errorHandler:
    ROLLBACK TRANSACTION;
    PRINT 'Transaction failed';
    RETURN -1;
GO

-- Get exam results of a student.
CREATE PROCEDURE getResults @studentID CHAR(7) AS

SELECT M.moduleCode, M.moduleName, E.semester, Ex.academicYear, Ex.dateHeld, Ma.grade
FROM Enrollment E,
     EnrollmentModule EM,
     Module M,
     Exam Ex,
     Mark Ma
WHERE E.studentID = @studentID
  AND E.enrollmentID = EM.enrollmentID
  AND EM.moduleCode = Ex.moduleCode
  AND EM.moduleCode = M.moduleCode
  AND Ex.examID = Ma.examID
  AND Ma.studentID = @studentID

GO

-- Get attendance of a particular student.
CREATE VIEW SessionCount AS
SELECT L.moduleCode, M.moduleName, L.type, S.batch, COUNT(*) count
FROM LectureHour L,
     Session S,
     Module M
WHERE L.lectureHourID = S.lectureHourID
  AND L.moduleCode = M.moduleCode
GROUP BY L.moduleCode, M.moduleName, L.type, S.batch
GO


-- Get attendance of all modules related to a student.
CREATE PROC getAttendance @studentID CHAR(7) AS
SELECT D.moduleCode, D.moduleName, D.type, D.batch, COUNT(a.sessionID) AS count, D.total
FROM (
         SELECT M.moduleName, L.moduleCode, L.type, S.batch, S.sessionID, SC.count total
         FROM Module M,
              LectureHour L,
              Session S,
              Enrollment E,
              EnrollmentModule EM,
              SessionCount SC
         WHERE E.studentID = @studentID
           AND E.enrollmentID = EM.enrollmentID
           AND EM.moduleCode = L.moduleCode
           AND E.batch = S.batch
           AND L.lectureHourID = S.lectureHourID
           AND SC.moduleCode = L.moduleCode
           AND SC.type = L.type
           AND SC.batch = S.batch
           AND M.moduleCode = L.moduleCode
     ) D
         LEFT JOIN Attendance A ON D.sessionID = A.sessionID AND A.studentID = @studentID
GROUP BY D.moduleCode, D.moduleName, D.type, D.batch, D.total
GO

-- Get attendance details of a given lecture hour and studentID
CREATE PROCEDURE getDetailedAttendance @studentID CHAR(7), @moduleCode CHAR(6), @type CHAR(15), @batch INT AS

SELECT X.date, IIF(A.studentID IS NULL, CAST(1 AS BIT), CAST(0 AS BIT)) status
FROM (
         SELECT S.sessionID, S.date
         FROM LectureHour L,
              Session S
         WHERE L.moduleCode = @moduleCode
           AND L.type = @type
           AND S.lectureHourID = L.lectureHourID
           AND S.batch = @batch
     ) X
         LEFT JOIN Attendance A ON X.sessionID = A.sessionID AND A.studentID = @studentID
GO

-- Get lecture hours and module name
CREATE PROCEDURE getLectureHours @moduleCode CHAR(6) AS

    SELECT moduleName
    FROM Module
    WHERE moduleCode = @moduleCode

    SELECT lectureHourID, type
    FROM LectureHour
    WHERE moduleCode = @moduleCode

GO

-- Get time tables
CREATE PROCEDURE getTimetables @username CHAR(7), @role INT AS
    IF @role = 1 OR @role = 2
        BEGIN
            SELECT L.moduleCode, M.moduleName, L.lectureHourID, L.type, L.startingTime, L.endingTime, L.day, L.lectureHall
            FROM LectureHour L, Module M WHERE L.moduleCode = M.moduleCode
        END
    ELSE
        BEGIN
            SELECT MAX(E.date) date, L.moduleCode, M.moduleName, L.lectureHourID, L.type, L.startingTime, L.endingTime, L.day, L.LectureHall
            FROM LectureHour L, Module M, Enrollment E, EnrollmentModule EM
            WHERE E.studentID = @username AND EM.enrollmentID = E.enrollmentID AND EM.moduleCode = M.moduleCode AND M.moduleCode = L.moduleCode
            GROUP BY L.moduleCode, M.moduleName, L.lectureHourID, L.type, L.startingTime, L.endingTime, L.day, L.LectureHall
        END
GO

-- Check if a module has results uploaded previously
CREATE PROCEDURE checkIfResultsUploaded @moduleCode CHAR(6), @academicYear INT AS
    IF EXISTS(SELECT 1 FROM Exam WHERE moduleCode = @moduleCode AND academicYear = @academicYear)
        RETURN -1;
    ELSE
        RETURN 1;
GO;

-- Mark array
CREATE TYPE MARK AS TABLE (
    studentID CHAR(7),
    mark INT
)
GO

-- Function returns grade for the input mark.
CREATE FUNCTION getGrade (@mark INT)
    RETURNS VARCHAR(2)
AS
BEGIN
    IF @mark < 30 RETURN 'F-'
    ELSE IF @mark < 35 RETURN 'F'
    ELSE IF @mark < 38 RETURN 'F+'
    ELSE IF @mark < 40 RETURN 'D-'
    ELSE IF @mark < 43 RETURN 'D'
    ELSE IF @mark < 48 RETURN 'D+'
    ELSE IF @mark < 50 RETURN 'C-'
    ELSE IF @mark < 54 RETURN 'C'
    ELSE IF @mark < 57 RETURN 'C+'
    ELSE IF @mark < 61 RETURN 'B-'
    ELSE IF @mark < 64 RETURN 'B'
    ELSE IF @mark < 67 RETURN 'B+'
    ELSE IF @mark < 71 RETURN 'A-'
    ELSE IF @mark < 75 RETURN 'A'
    ELSE RETURN 'A+'
    RETURN 'NA'
END
GO

-- Upload Marks to the database
CREATE PROCEDURE uploadMarks @moduleCode CHAR(6), @date DATE, @academicYear INT, @marks MARK READONLY AS
BEGIN TRANSACTION

    IF EXISTS (SELECT 1 FROM Exam WHERE moduleCode = @moduleCode AND academicYear = @academicYear)
        BEGIN
            SELECT 'Previously entered marks exist in the system' AS duplicateEntry
            GOTO errorhandler;
        END
    ELSE
        BEGIN
            INSERT INTO Exam(moduleCode, dateHeld, academicYear) VALUES (@moduleCode, @date, @academicYear);
            IF @@ROWCOUNT = 0 GOTO errorHandler;

            DECLARE cursor_marks CURSOR FOR SELECT * FROM @marks
            DECLARE @studentID CHAR(7), @mark INT, @grade VARCHAR(2)
            OPEN cursor_marks
            FETCH NEXT FROM cursor_marks INTO @studentID, @mark
            WHILE @@FETCH_STATUS = 0
                BEGIN
                    IF EXISTS (SELECT 1 FROM Enrollment E, EnrollmentModule EM WHERE E.studentID = @studentID AND E.enrollmentID = EM.enrollmentID AND EM.moduleCode = @moduleCode)
                        BEGIN
                            EXEC @grade = getGrade @mark
                            INSERT INTO Mark VALUES (IDENT_CURRENT('Exam'), @studentID, @mark, @grade)
                            IF @@ROWCOUNT = 0 GOTO errorHandler
                            FETCH NEXT FROM cursor_marks INTO @studentID, @mark
                        END
                    ELSE
                        BEGIN
                            SELECT 'Found students who are not registered to the module' AS invalidStudentID
                            GOTO errorhandler
                        END
                END
        END

COMMIT TRANSACTION
RETURN 0;

errorHandler:
    PRINT 'Error executing the query'
    ROLLBACK TRANSACTION
    RETURN -1
GO

-- Get results of a given module and academic year
CREATE PROCEDURE getResultsOfExam @moduleCode CHAR(6), @academicYear INT AS

    SELECT examID, dateHeld FROm Exam WHERE moduleCode = @moduleCode AND academicYear = @academicYear
    SELECT M.studentID, M.mark, M.grade FROM Exam E, Mark M
    WHERE E.moduleCode = @moduleCode AND E.academicYear = @academicYear AND E.examID = M.examID

GO

--Delete exam of a given module and academic year
CREATE PROCEDURE deleteExam @moduleCode CHAR(6), @academicyear INT AS
BEGIN TRANSACTION

    DECLARE @examID INT
    SELECT @examID = examID FROM Exam WHERE moduleCode = @moduleCode AND academicYear = @academicyear

    DELETE FROM Mark WHERE examID = @examID
    IF @@ROWCOUNT = 0 GOTO errorHandler

    DELETE FROM Exam WHERE moduleCode = @moduleCode AND academicYear = @academicyear
    IF @@ROWCOUNT = 0 GOTO errorHandler

COMMIT TRANSACTION
RETURN 0;

errorHandler:
    PRINT 'Transaction failed'
    ROLLBACK TRANSACTION
    RETURN -1;
GO

CREATE TYPE MARKS AS TABLE (
    studentID CHAR(7),
    mark INT
)
GO

-- Modify results related to any module and any student.
CREATE PROCEDURE editResults @examID INT, @dateHeld DATE, @results MARKS READONLY AS
    BEGIN TRANSACTION

UPDATE Exam SET dateHeld = @dateHeld WHERE examID = @examID
    IF @@ROWCOUNT = 0 GOTO errorHandler

DECLARE cursor_results CURSOR FOR SELECT * FROM @results
DECLARE @studentID CHAR(7), @mark INT, @grade VARCHAR(2)
    OPEN cursor_results
    FETCH NEXT FROM cursor_results INTO @studentID, @mark
    WHILE @@FETCH_STATUS = 0
        BEGIN
            EXEC @grade = getGrade @mark
            UPDATE Mark SET mark = @mark, grade = @grade WHERE examID = @examID AND studentID = @studentID
            IF @@ROWCOUNT = 0 GOTO errorHandler
            FETCH NEXT FROM cursor_results INTO @studentID, @mark
        END

    COMMIT TRANSACTION
    RETURN 0

    errorHandler:
    ROLLBACK TRANSACTION
    PRINT 'Transaction failed'
    RETURN -1
GO

-- Attendance array
CREATE TYPE SESSION_ATTENDANCE AS TABLE (
    studentID CHAR(7)
)
GO

-- Upload attendance to existing or new session
CREATE PROCEDURE uploadAttendance @lectureHourID INT, @batch INT, @date DATE, @time CHAR(5), @attendance SESSION_ATTENDANCE READONLY AS
    BEGIN TRANSACTION
INSERT INTO Session (lectureHourID, date, batch) VALUES (@lectureHourID, DATEADD(day, 1, CAST(@date AS DATETIME) + CAST(@time AS DATETIME)), @batch)
    IF @@ROWCOUNT = 0 GOTO errorHandler
DECLARE cursor_attendance CURSOR FOR SELECT * FROM @attendance
DECLARE @record CHAR(7)
    OPEN cursor_attendance
    FETCH NEXT FROM cursor_attendance INTO @record
    WHILE @@FETCH_STATUS = 0
        BEGIN
            INSERT INTO Attendance VALUES (IDENT_CURRENT('Session'), @record)
            IF @@ROWCOUNT = 0 GOTO errorHandler
            FETCH NEXT FROM cursor_attendance INTO @record
        END
    COMMIT TRANSACTION
    RETURN 0

    errorHandler:
    ROLLBACK TRANSACTION
    RETURN 1
    PRINT 'Transaction failed!'
GO

-- Get attendance of a particular session
CREATE PROCEDURE getSessionAttendance @sessionID INT AS
DECLARE @moduleCode CHAR(6), @batch INT
SELECT @moduleCode = L.moduleCode, @batch = S.batch FROM LectureHour L, Session S WHERE S.sessionID = @sessionID AND L.lectureHourID = S.lectureHourID
    PRINT @moduleCode
    PRINT @batch
SELECT D.studentID AS StudentID, IIF(A.studentID IS NULL, 'Present', 'Absent') AS status
FROM (SELECT E.studentID FROM Enrollment E, EnrollmentModule EM WHERE EM.moduleCode = @moduleCode AND EM.enrollmentID = E.enrollmentID AND E.batch = @batch) D
LEFT JOIN Attendance A ON A.sessionID = @sessionID AND D.studentID = A.studentID
GO

-- Modify attendance of a particular session
CREATE PROCEDURE modifyAttendance @sessionID INT, @attendance SESSION_ATTENDANCE READONLY AS
    BEGIN TRANSACTION
DECLARE @record CHAR(7)
DELETE FROM Attendance WHERE sessionID = @sessionID
DECLARE cursor_attendance CURSOR FOR SELECT * FROM @attendance
    OPEN cursor_attendance
    FETCH NEXT FROM cursor_attendance INTO @record
    WHILE @@FETCH_STATUS = 0
        BEGIN
            PRINT @sessionID
            PRINT @record
            INSERT INTO Attendance VALUES (@sessionID, @record)
            FETCH NEXT FROM cursor_attendance INTO @record
        END
    COMMIT TRANSACTION
    RETURN 0;
GO

CREATE PROCEDURE getNotifications @username CHAR(7) AS
SELECT N.notificationID, N.subject, N.message, U.firstName + ' ' + U.lastName sentBy, N.timeSent, R.received FROM Notification N, Received R, Users U
WHERE R.recipientID = @username AND R.notificationID = N.notificationID AND U.username = N.sentBy AND N.timeSent >= DATEADD(MONTH, -2, GETDATE())
GO

-- Array of recipients for a notification.
CREATE TYPE RECIPIENTS AS TABLE (
    recipient VARCHAR(7)
)
GO

-- Save messages to the database.
CREATE PROCEDURE addNotification @sentBy CHAR(7), @subject VARCHAR(100), @message VARCHAR(500), @timeSent DATETIME, @recipients RECIPIENTS READONLY AS
    BEGIN TRANSACTION

INSERT INTO Notification (sentby, subject, message, timeSent) VALUES (@sentBy, @subject, @message, @timeSent);
    IF @@ROWCOUNT = 0 GOTO errorHandler;

DECLARE @recipient VARCHAR(7);
DECLARE cursor_recipients CURSOR FOR SELECT * FROM @recipients

    OPEN cursor_recipients;
    FETCH NEXT FROM cursor_recipients INTO @recipient;
    WHILE @@FETCH_STATUS = 0
        BEGIN
            IF @recipient LIKE REPLICATE('[0-9]', 6) + '[A-Z]'
                BEGIN
                    INSERT INTO Received VALUES (IDENT_CURRENT('Notification'), CAST(@recipient AS CHAR(7)), IIF(@recipient = @sentBy, 1, 0));
                    IF @@ROWCOUNT = 0 GOTO errorHandler;
                END
            ELSE IF @recipient LIKE '20' + REPLICATE('[0-9]', 2)
                BEGIN
                    DECLARE cursor_batch CURSOR FOR SELECT studentID FROM Student WHERE studentID LIKE SUBSTRING(@recipient, 3, 4) + '%';
                    OPEN cursor_batch
                    FETCH NEXT FROM cursor_batch INTO @recipient
                    WHILE @@FETCH_STATUS = 0
                        BEGIN
                            INSERT INTO Received VALUES (IDENT_CURRENT('Notification'), @recipient, 0)
                            IF @@ROWCOUNT = 0 GOTO errorHandler;
                            FETCH NEXT FROM cursor_batch INTO @recipient
                        END
                END
            FETCH NEXT FROM cursor_recipients INTO @recipient
        END
    COMMIT TRANSACTION
    RETURN IDENT_CURRENT('Notification');

    errorHandler:
    ROLLBACK TRANSACTION;
    PRINT 'Transaction failed'
    RETURN 0;
GO

-- Array of notifications
CREATE TYPE NOTIFICATIONS AS TABLE (
    notificationID INT
)
GO

-- Updates status of notification related to a student whether the notification is received or not.
CREATE PROCEDURE updateNotificationStatus @receiverID CHAR(7), @notifications NOTIFICATIONS READONLY AS
    BEGIN TRANSACTION
UPDATE Received SET received = 1 WHERE recipientID = @receiverID AND notificationID IN (SELECT notificationID FROM @notifications);
    COMMIT TRANSACTION
GO

-- Holds educations qualifications of a student.
CREATE TYPE EDUCATION_QUALIFICATION AS TABLE (
    degree VARCHAR(50),
    institute VARCHAR(50),
    dateCompleted DATE,
    class VARCHAR(20)
)
GO

-- Register new student to the system.
CREATE PROCEDURE registerStudent
    @studentID CHAR(7),
    @courseID VARCHAR(50),
    @academicYear INT,
    @fullName VARCHAR(100),
    @nameWithInitials VARCHAR(50),
    @firstName VARCHAR(20),
    @lastName VARCHAR(20),
    @address VARCHAR(255),
    @district CHAR(5),
    @province CHAR(4),
    @dateOfBirth DATE,
    @race VARCHAR(15),
    @religion VARCHAR(15),
    @gender CHAR(1),
    @nic VARCHAR(12),
    @email VARCHAR(50),
    @mobile VARCHAR(12),
    @home VARCHAR(12),
    @designation VARCHAR(50),
    @employer VARCHAR(50),
    @company VARCHAR(50),
    @educationQualifications EDUCATION_QUALIFICATION READONLY
AS
    BEGIN TRANSACTION

INSERT INTO Users VALUES (@studentID, @nic, @email, @firstName, @lastName, 3)
    IF @@ROWCOUNT = 0 GOTO errorHandler

INSERT INTO Student VALUES (@studentID, @courseID, @fullName, @nameWithInitials, @address, @district, @province, @dateOfBirth, @race, @religion, @gender, @nic, @mobile, @home, @designation, @employer, @company, @academicyear)
    IF @@ROWCOUNT = 0 GOTO errorHandler

DECLARE cursor_educationQualifications CURSOR FOR SELECT * FROM @educationQualifications
DECLARE @degree VARCHAR(50), @institute VARCHAR(50), @dateCompleted DATE, @class VARCHAR(20)

    OPEN cursor_educationQualifications
    FETCH NEXT FROM cursor_educationQualifications INTO @degree, @institute, @dateCompleted, @class
    WHILE @@FETCH_STATUS = 0
        BEGIN
            INSERT INTO EducationQualification (studentID, degree, institute, dateCompleted, class) VALUES (@studentID, @degree, @institute, @dateCompleted, @class)
            IF @@ROWCOUNT = 0 GOTO errorHandler
            FETCH NEXT FROM cursor_educationQualifications INTO @degree, @institute, @dateCompleted, @class
        END

    COMMIT TRANSACTION
    RETURN 0

    errorHandler:
    ROLLBACK TRANSACTION
    PRINT 'Transaction failed..!'
    RETURN -1
GO



--==================Newly added=============================

-- Get Registered users.
CREATE PROCEDURE getRegisteredUsersList AS

SELECT U.title, S.fullName, S.nic, U.email, S.mobile
FROM Student S,
     Users U
WHERE S.studentID = U.username
  AND U.role = 3
  AND U.status = 1





CREATE TABLE Payment
(
	id   				INT NOT NULL,
    slipNo 				CHAR(50) NOT NULL UNIQUE,
    amount 				INT,
	paymentDate			DATE,
	bank 				CHAR(50) NOT NULL,
	studentID 			CHAR(7) NOT NULL,
	confirmStatus       INT DEFAULT 0,
	description         CHAR(50),
    status              INT DEFAULT 0,
    CONSTRAINT PK_Id PRIMARY KEY (id),
    CONSTRAINT FK_paymentStudentID FOREIGN KEY (studentID) REFERENCES Student (studentID)
)
GO



INSERT INTO Payment
VALUES (1,'123456',250000,'2020-02-12','sampath','184061R',1),
       (2,'123457',280000,'2020-02-18','Boc','204001F',1),
       (3,'123458',450000,'2020-02-20','HNB','204002B',0),
	   (4,'123459',200000,'2020-09-20','sampath','184061R',0),
	   (5,'123460',170000,'2020-10-18','BOC','204001F',0);
GO



-- Get confirmed payment lists filter using . 0 for pending payments 1 for confirmed payments, -1 for rejected payments.
CREATE PROCEDURE getConfirmedPaymentsList AS
SELECT SUM(P.amount) AS totalPayment, S.studentID, U.title, S.fullName, C.courseName
FROM Payment P,
	 Student S,
     Users U,
	 Course C
WHERE P.confirmStatus = 1
  AND P.studentID = S.studentID
  AND S.StudentID = U.username
  AND S.courseId  = C.courseID
GROUP BY  S.studentID, U.title, S.fullName, C.courseName
  
GO

-- Get pending payment lists filter using . 0 for pending payments 1 for confirmed payments, -1 for rejected payments.
CREATE PROCEDURE getPendingPaymentsList AS
SELECT P.amount, S.studentID, U.title, S.fullName, C.courseName,P.paymentDate, P.slipNo
FROM Payment P,
	 Student S,
     Users U,
	 Course C
WHERE P.confirmStatus = 0
  AND P.studentID = S.studentID
  AND S.StudentID = U.username
  AND S.courseId  = C.courseID
  ORDER BY P.paymentDate ASC
  
GO

-- Get payment history of a student 
CREATE PROCEDURE getStudentPayments @studentID CHAR(50) AS
SELECT P.amount, P.slipNo, P.paymentDate, P.confirmStatus, S.studentID, U.title, S.fullName
FROM Payment P,
	 Student S,
     Users U
WHERE P.studentID = @studentID
  AND P.studentID = S.studentID
  AND S.StudentID = U.username
  ORDER BY P.paymentDate ASC
  
GO

-- Get Details of a payment
CREATE PROCEDURE viewPaymentDetails @slipNo CHAR(50) AS
SELECT P.amount, P.slipNo, P.paymentDate, P.bank, S.studentID, U.title, S.fullName, S.academicYear, C.courseName
FROM Payment P,
	 Student S,
	 Users U,
     Course C
WHERE P.slipNo = @slipNo
  AND P.studentID = S.studentID
  AND S.courseID = C.courseID
  AND S.studentID = U.username
  ORDER BY P.paymentDate ASC
  
GO


-- Get details of a student given registration number 
CREATE PROCEDURE getStudentDetails @studentID CHAR(50) AS
SELECT S.fullName, S.studentID, U.title, S.fullName, S.academicYear, C.courseName, P.status
FROM Payment P,
	 Student S,
     Users U,
	 Course C
WHERE P.studentID = @studentID
  AND P.studentID = S.studentID
  AND S.StudentID = U.username
  AND S.courseID = C.courseID
  
GO

--TODO--
--CREATE PROCEDURE uploadPayments @studentID CHAR(50) AS