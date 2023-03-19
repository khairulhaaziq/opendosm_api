const express = require("express");
const axios = require("axios");
const Papa = require("papaparse");

const app = express();
const port = process.env.PORT || 3000;

function filterColumns(data, columns) {
	return data.map((row) => {
		const newRow = {};
		columns.forEach((column) => {
			if (row.hasOwnProperty(column)) {
				newRow[column] = row[column];
			}
		});
		return newRow;
	});
}

function filterByColumn(data, column, value) {
	return data.filter((i) => i[column] == value);
}

//app.set("json spaces", 4);

app.get("/api/:bucket/:file_name", async (req, res) => {
	try {
		const { bucket, file_name } = req.params;
		const { columns } = req.query;

		if (bucket == "catalog" || bucket == "dashboard") {
			axios.get(
				`https://raw.githubusercontent.com/dosm-malaysia/aksara-data/main/${bucket}/${file_name}.json`
			)
				.then(function (response) {
					res.setHeader(
						"Content-Type",
						"application/json"
					);
					res.send(response.data);
				})
				.catch(function (error) {
					res.status(500).json({
						message: `Error fetching JSON file :${bucket}/${file_name}`,
						error,
					});
				});
		} else {
			const response = await axios.get(
				`https://storage.googleapis.com/${bucket}/${file_name}.csv`
			);

			Papa.parse(response.data, {
				header: true,
				complete: (results) => {
					let filteredResults = results.data;

					if (columns) {
						const columnList =
							columns.split(",");
						filteredResults = filterColumns(
							filteredResults,
							columnList
						);
					}

					Object.keys(req.query).forEach(
						(key) => {
							if (key !== "columns") {
								filteredResults =
									filterByColumn(
										filteredResults,
										key,
										req
											.query[
											key
										]
									);
							}
						}
					);

					res.json(filteredResults);
				},
				error: (err) => {
					res.status(500).json({
						message: `Error parsing CSV file :${bucket}/${file_name}`,
						error: err,
					});
				},
			});
		}
	} catch (error) {
		res.status(500).json({
			message: `Error fetching CSV file: :${bucket}/${file_name}`,
			error,
		});
	}
});

app.listen(port, () => {
	console.log(`Server is running on port ${port}`);
});
